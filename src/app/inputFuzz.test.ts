import { it,expect } from 'vitest';
import fc from 'fast-check';
import { convertReducer,initialConvertState } from '../features/convert/model';
import { insertAtSelection } from '../features/scientific/editorModel';
import { decodePermalink } from './permalinks';
it('bounded arbitrary editor, quick input and permalink data never escape their adapters',()=>{
  fc.assert(fc.property(fc.string({maxLength:12000}),text=>{
    expect(()=>convertReducer(initialConvertState(),{type:'query',text,locale:'de'})).not.toThrow();
    expect(()=>insertAtSelection({text,anchor:0,head:text.length},{text:'sin()'})).not.toThrow();
    expect(()=>decodePermalink('#/scientific?e='+encodeURIComponent(text))).not.toThrow();
  }),{seed:15015,numRuns:500});
});
