import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
import {
  EditorView,
  keymap,
  drawSelection,
  highlightSpecialChars,
} from '@codemirror/view';
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
  bracketMatching,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionStatus,
  closeCompletion,
  acceptCompletion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { setDiagnostics } from '@codemirror/lint';
import {
  constantRegistry,
  functionRegistry,
  type EngineError,
} from '../../engine';
import { t, type Locale } from '../../shared/i18n';
import {
  insertAtSelection,
  singleLine,
  type EditorSnapshot,
  type Insertion,
} from './editorModel';
import { errorKey } from './model';
import { shortcutHint } from '../../app/shortcuts';
import { completionEntries } from './registry';
export interface EditorHandle {
  insert: (insertion: Insertion) => void;
  focus: () => void;
}
interface Props {
  ref?: Ref<EditorHandle>;
  value: string;
  locale: Locale;
  error: EngineError | null;
  onChange: (value: string) => void;
  onEvaluate: () => void;
  onBrowse: (direction: -1 | 1) => void;
  label?: string;
  describedBy?: string;
  isInvalid?: boolean;
  compact?: boolean;
}
const externalChange = Annotation.define<boolean>();
const language = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^0(?:[xX][0-9a-fA-F]+|[bB][01]+|[oO][0-7]+)/))
      return 'number';
    if (stream.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/))
      return 'number';
    const name = stream.match(/^[A-Za-z_πφτ][A-Za-z_0-9]*/);
    if (name) {
      const id = typeof name === 'boolean' ? '' : name[0];
      return Object.hasOwn(functionRegistry, id)
        ? 'variableName.function'
        : Object.hasOwn(constantRegistry, id) ||
            ['π', 'φ', 'τ', 'i', 'j'].includes(id)
          ? 'variableName.constant'
          : 'variableName';
    }
    if (stream.match(/^(?:<<|>>|[&|~+\-*/^!=%°×÷−])/)) return 'operator';
    if (stream.match(/^[()]/)) return 'paren';
    stream.next();
    return 'punctuation';
  },
  languageData: { closeBrackets: { brackets: ['('] } },
});
const highlights = HighlightStyle.define([
  { tag: tags.number, color: 'var(--md-sys-color-on-surface)' },
  {
    tag: tags.function(tags.variableName),
    color: 'var(--md-sys-color-primary)',
    fontWeight: '650',
  },
  {
    tag: tags.constant(tags.variableName),
    color: 'var(--md-sys-color-tertiary)',
  },
  { tag: tags.variableName, color: 'var(--md-sys-color-secondary)' },
  { tag: tags.operator, color: 'var(--md-sys-color-primary)' },
  { tag: tags.paren, color: 'var(--md-sys-color-on-surface-variant)' },
]);
const theme = EditorView.theme({
  '&': {
    color: 'var(--md-sys-color-on-surface)',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    borderRadius: 'var(--md-sys-shape-large)',
    fontSize: '1.25rem',
  },
  '&.cm-focused': {
    outline: '3px solid var(--md-sys-color-primary)',
    outlineOffset: '3px',
  },
  '.cm-content': {
    padding: '1.25rem',
    caretColor: 'var(--md-sys-color-primary)',
    minHeight: '4rem',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "'Roboto Mono', monospace",
  },
  '.cm-cursor': { borderLeftColor: 'var(--md-sys-color-primary)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--md-sys-color-secondary-container)' },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
  },
  '.cm-nonmatchingBracket': {
    backgroundColor: 'var(--md-sys-color-error-container)',
    color: 'var(--md-sys-color-on-error-container)',
  },
  '.cm-tooltip': {
    border: '1px solid var(--md-sys-color-outline)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)',
    borderRadius: 'var(--md-sys-shape-medium)',
    fontSize: '0.875rem',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--md-sys-color-primary-container)',
    color: 'var(--md-sys-color-on-primary-container)',
  },
  '.cm-diagnostic-error': { borderLeft: '3px solid var(--md-sys-color-error)' },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: 'underline wavy var(--md-sys-color-error)',
    textUnderlineOffset: '0.3em',
  },
  '.cm-lintPoint-error::after': {
    borderBottomColor: 'var(--md-sys-color-error)',
  },
});
function completions(locale: Locale) {
  const entries = completionEntries(locale);
  return autocompletion({
    // Tab explicitly accepts a visible completion; Enter is reserved for evaluation.
    interactionDelay: 0,
    override: [
      (ctx: CompletionContext) => {
        const word = ctx.matchBefore(/[A-Za-z_πφτ][A-Za-z_0-9]*/);
        if (!word && !ctx.explicit) return null;
        return {
          from: word?.from ?? ctx.pos,
          options: entries.map((e) => ({
            label: e.name,
            type: e.kind,
            detail: e.signature,
            info: e.description,
            apply: e.kind === 'function' ? `${e.name}(` : e.name,
          })),
          validFor: /^[A-Za-z_0-9πφτ]*$/,
        };
      },
    ],
  });
}
export default function ExpressionEditor({
  ref,
  value,
  locale,
  error,
  onChange,
  onEvaluate,
  onBrowse,
  label,
  describedBy,
  isInvalid = false,
  compact = false,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null);
  const callbacks = useRef({ value, locale, onChange, onEvaluate, onBrowse });
  const completionConfig = useRef(new Compartment());
  useEffect(() => {
    callbacks.current = { value, locale, onChange, onEvaluate, onBrowse };
  });
  useImperativeHandle(
    ref,
    () => ({
      focus: () => view.current?.focus(),
      insert: (insertion) => {
        const editor = view.current;
        if (!editor) return;
        const sel = editor.state.selection.main;
        const snapshot: EditorSnapshot = {
          text: editor.state.doc.toString(),
          anchor: sel.anchor,
          head: sel.head,
        };
        const next = insertAtSelection(snapshot, insertion);
        editor.dispatch({
          changes: { from: 0, to: editor.state.doc.length, insert: next.text },
          selection: { anchor: next.anchor, head: next.head },
        });
        editor.focus();
      },
    }),
    [],
  );
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: callbacks.current.value,
        extensions: [
          theme,
          language,
          syntaxHighlighting(highlights),
          bracketMatching(),
          closeBrackets(),
          drawSelection(),
          highlightSpecialChars(),
          history(),
          completionConfig.current.of(completions(callbacks.current.locale)),
          EditorView.contentAttributes.of({
            role: 'textbox',
            'aria-label': t('scientific.expression', callbacks.current.locale),
            'aria-multiline': 'false',
            'aria-describedby': 'scientific-editor-help',
            spellcheck: 'false',
          }),
          EditorState.transactionFilter.of((tr) =>
            tr.newDoc.lines > 1
              ? [
                  tr,
                  {
                    changes: {
                      from: 0,
                      to: tr.newDoc.length,
                      insert: singleLine(tr.newDoc.toString()),
                    },
                    sequential: true,
                  },
                ]
              : tr,
          ),
          Prec.high(
            keymap.of([
              {
                key: shortcutHint('scientific.complete'),
                run: acceptCompletion,
              },
              {
                key: shortcutHint('scientific.evaluate'),
                run: () => {
                  callbacks.current.onEvaluate();
                  return true;
                },
              },
              {
                key: 'ArrowUp',
                run: (v) => {
                  if (completionStatus(v.state)) return false;
                  callbacks.current.onBrowse(-1);
                  return true;
                },
              },
              {
                key: 'ArrowDown',
                run: (v) => {
                  if (completionStatus(v.state)) return false;
                  callbacks.current.onBrowse(1);
                  return true;
                },
              },
              {
                key: shortcutHint('scientific.clear'),
                run: (v) => {
                  closeCompletion(v);
                  callbacks.current.onChange('');
                  return true;
                },
              },
            ]),
          ),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((tr) => tr.annotation(externalChange))
            )
              callbacks.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      selection: { anchor: value.length },
      annotations: externalChange.of(true),
    });
  }, [value]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch({
      effects: completionConfig.current.reconfigure(completions(locale)),
    });
    editor.contentDOM.setAttribute(
      'aria-label',
      t('scientific.expression', locale),
    );
  }, [locale]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.contentDOM.setAttribute('aria-invalid', String(!!error));
    editor.contentDOM.setAttribute(
      'aria-describedby',
      error
        ? 'scientific-editor-help scientific-editor-error'
        : 'scientific-editor-help',
    );
    editor.dispatch(
      setDiagnostics(
        editor.state,
        error
          ? [
              {
                from: Math.min(editor.state.doc.length, error.range.start),
                to: Math.min(
                  editor.state.doc.length,
                  Math.max(error.range.end, error.range.start),
                ),
                severity: 'error',
                message: t(errorKey(error), locale),
              },
            ]
          : [],
      ),
    );
  }, [error, locale, value]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    if (label) editor.contentDOM.setAttribute('aria-label', label);
    if (describedBy)
      editor.contentDOM.setAttribute('aria-describedby', describedBy);
    if (isInvalid) editor.contentDOM.setAttribute('aria-invalid', 'true');
  }, [label, describedBy, isInvalid, locale, error, value]);
  return (
    <div
      ref={host}
      className={
        compact ? 'scientific-editor graph-editor' : 'scientific-editor'
      }
    />
  );
}
