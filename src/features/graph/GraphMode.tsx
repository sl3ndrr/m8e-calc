import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { Button, Checkbox, Chip, Dialog, Select, TextField, snackbarQueue } from '../../ui';
import { t, formatNumber } from '../../shared/i18n';
import { useAppStore } from '../../shared/store';
import { useModeHistory } from '../../shared/useModeHistory';
import type { HistoryEntry } from '../../shared/history';
import { initialPlot, plotReducer, newRow, parseRow, parameter, advanceParameter, plotPayload, restorePlot, tableValues, type PlotAction, type Trace } from './model';
import { analyze, type AnalysisKind } from './analysisAdapter';
import type { IntegralShade, Marker } from './renderer';
import GraphCanvas, { type CanvasHandle } from './GraphCanvas';
import FunctionPanel from './FunctionPanel';
import './GraphMode.css';
export default function GraphMode() {
  const [state,dispatch]=useReducer(plotReducer,undefined,initialPlot);
  const [palette,setPalette]=useState<string[]>([]),[markers,setMarkers]=useState<Marker[]>([]),[shade,setShade]=useState<IntegralShade|null>(null),[auxiliary,setAuxiliary]=useState<ReturnType<typeof analyze>['tangent']>(null),[integral,setIntegral]=useState<ReturnType<typeof analyze>['integral']>(null);
  const [integralId,setIntegralId]=useState<string|null>(null),[playing,setPlaying]=useState<string|null>(null),[table,setTable]=useState(false),[tableId,setTableId]=useState<string|null>(null),[step,setStep]=useState('1'),[background,setBackground]=useState('theme'),[exporting,setExporting]=useState(false),[context,setContext]=useState<Trace|null>(null),[contextOther,setContextOther]=useState<string|null>(null);
  const locale=useAppStore(s=>s.locale),canvas=useRef<CanvasHandle>(null),lastTrace=useRef<Trace|null>(null),latest=useRef(state),sent=useRef(JSON.stringify(initialPlot()));
  const parsed=useMemo(()=>state.rows.map(parseRow),[state.rows]);
  const plotted=useMemo(()=>auxiliary?[...parsed,{row:newRow('tangent','',7),curve:auxiliary,error:null,names:[]}]:parsed,[parsed,auxiliary]);
  useEffect(()=>{latest.current=state;});
  const clearAnalysis=useCallback(()=>{setMarkers([]);setShade(null);setAuxiliary(null);setIntegral(null);setIntegralId(null);},[]);
  const change=useCallback((action:PlotAction)=>{if(action.type!=='view'&&action.type!=='options')clearAnalysis();dispatch(action);},[clearAnalysis]);
  const restore=useCallback((entry:HistoryEntry)=>{const plot=restorePlot(entry.payload);if(!plot)return;sent.current=JSON.stringify(plot);setPlaying(null);setContext(null);clearAnalysis();dispatch({type:'restore',plot});},[clearAnalysis]);
  const {add}=useModeHistory('graph',restore);
  useEffect(()=>{
    const signature=JSON.stringify(state);if(sent.current===signature||playing||!state.rows.some(r=>r.input.trim()))return;
    const timer=window.setTimeout(()=>{add({input:state.rows.map(r=>r.input).filter(Boolean).join(' ; '),result:t('graph.plotSet',locale,{count:state.rows.length}),payload:plotPayload(state)});sent.current=signature;},3000);
    return ()=>window.clearTimeout(timer);
  },[state,playing,add,locale]);
  useEffect(()=>{
    if(!playing)return;const split=playing.lastIndexOf(':'),id=playing.slice(0,split),name=playing.slice(split+1),row=latest.current.rows.find(r=>r.id===id);if(!row)return;
    let base=parameter(row,name),start=performance.now();
    const timer=window.setInterval(()=>{const current=latest.current.rows.find(r=>r.id===id);if(!current)return;const p=parameter(current,name);if(p.min!==base.min||p.max!==base.max||p.step!==base.step){base=p;start=performance.now();}
      change({type:'update',id,patch:{params:{...current.params,[name]:advanceParameter(base,(performance.now()-start)/1000)}}});},50);
    return ()=>window.clearInterval(timer);
  },[playing,change]);
  const onPalette=useCallback((colors:string[])=>setPalette(old=>old.join()===colors.join()?old:colors),[]);
  const onView=useCallback((bounds:typeof state.bounds)=>dispatch({type:'view',bounds}),[]);
  const onTrace=useCallback((trace:Trace|null)=>{lastTrace.current=trace;},[]);
  const onPlay=useCallback((id:string,name:string)=>{if(!id){setPlaying(null);return;}setPlaying(old=>old===`${id}:${name}`?null:`${id}:${name}`);},[]);
  function runAnalysis(id:string,kind:AnalysisKind,other?:string,range?:readonly[number,number]):void {
    const row=parsed.find(r=>r.row.id===id);if(!row?.curve)return;
    if(kind==='integral'&&!range){setIntegralId(id);canvas.current?.viewport();return;}
    const viewport=canvas.current?.viewport();if(!viewport)return;
    const u=lastTrace.current?.id===id ? lastTrace.current.u : row.curve.kind==='parametric'||row.curve.kind==='polar' ? (row.curve.range[0]+row.curve.range[1])/2 : (viewport.bounds.xMin+viewport.bounds.xMax)/2;
    const result=analyze(row.curve,id,kind,viewport.bounds,parsed.find(r=>r.row.id===other)?.curve??undefined,u,range);
    setMarkers(result.markers);setAuxiliary(result.tangent);setShade(result.shade);setIntegral(result.integral);setIntegralId(null);
    if(!result.markers.length&&!result.integral)snackbarQueue.add({message:t('graph.noAnalysis',locale)});
  }
  async function exportPng(copy:boolean):Promise<void> {
    setExporting(true);
    try {const blob=await canvas.current?.export(background==='transparent');if(!blob)throw new Error('PNG unavailable');
      if(copy){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);snackbarQueue.add({message:t('graph.copied',locale)});}
      else {const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='m8e-graph.png';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch{snackbarQueue.add({message:t('graph.exportError',locale)});}finally{setExporting(false);}
  }
  const selected=parsed.find(r=>r.row.id===tableId&&r.curve)??parsed.find(r=>r.curve);
  const tableRows=selected?.curve?tableValues(selected.curve,state.bounds,Number(step)):[];
  return <section className="graph-mode" style={Object.fromEntries(palette.map((color,index)=>[`--md-sys-color-graph-${index}`,color])) as CSSProperties} aria-label={t('graph.title',locale)}>
    <header className="graph-heading"><div><p className="shell-eyebrow">{t('graph.eyebrow',locale)}</p><h1>{t('graph.title',locale)}</h1></div><div className="graph-toolbar"><Button size="sm" variant="tonal" onPress={()=>canvas.current?.fit()}>{t('graph.fit',locale)}</Button><Button size="sm" variant="text" onPress={()=>canvas.current?.reset()}>{t('graph.reset',locale)}</Button><Button size="sm" variant="text" aria-label={t('graph.zoomIn',locale)} onPress={()=>canvas.current?.zoom(1.3)}>+</Button><Button size="sm" variant="text" aria-label={t('graph.zoomOut',locale)} onPress={()=>canvas.current?.zoom(1/1.3)}>−</Button></div></header>
    <div className="graph-options"><Checkbox isSelected={state.lockAspect} onChange={lockAspect=>change({type:'options',patch:{lockAspect}})}>{t('graph.aspect',locale)}</Checkbox><Checkbox isSelected={state.pi} onChange={pi=>change({type:'options',patch:{pi}})}>{t('graph.pi',locale)}</Checkbox><Checkbox isSelected={state.fine} onChange={fine=>change({type:'options',patch:{fine}})}>{t('graph.fine',locale)}</Checkbox><Select label={t('graph.presets',locale)} selectedKey={null} options={[{id:'standard',label:t('graph.standard',locale)},{id:'trig',label:t('graph.trig',locale)},{id:'unit',label:t('graph.unit',locale)}]} onSelectionChange={key=>{const bounds=key==='trig'?{xMin:-2*Math.PI,xMax:2*Math.PI,yMin:-2,yMax:2}:key==='unit'?{xMin:-2,xMax:2,yMin:-2,yMax:2}:initialPlot().bounds;canvas.current?.preset(bounds);}} /></div>
    <div className="graph-layout"><div className="graph-stage"><GraphCanvas ref={canvas} rows={plotted} bounds={state.bounds} lockAspect={state.lockAspect} pi={state.pi} fine={state.fine} locale={locale} markers={markers} shade={shade} integralCurveId={integralId} onView={onView} onIntegral={(from,to)=>{if(integralId)runAnalysis(integralId,'integral',undefined,[from,to]);}} onTrace={onTrace} onContext={setContext} onPalette={onPalette} />
    {!state.rows.length&&<div className="graph-empty"><h2>{t('graph.emptyTitle',locale)}</h2><p>{t('graph.emptyHint',locale)}</p></div>}
    {(markers.length>0||integral)&&<div className="graph-results" aria-label={t('graph.results',locale)}>{markers.map(marker=><Chip key={marker.id} kind="input" onPress={()=>{const v=canvas.current?.viewport();if(!v)return;const b=v.bounds,dx=(b.xMax-b.xMin)/2,dy=(b.yMax-b.yMin)/2;canvas.current?.preset({xMin:marker.x-dx,xMax:marker.x+dx,yMin:marker.y-dy,yMax:marker.y+dy});}} onRemove={()=>setMarkers(old=>old.filter(m=>m.id!==marker.id))} removeLabel={t('graph.removeMarker',locale)}>{t(`graph.analysis.${marker.label as AnalysisKind}`,locale)} · ({formatNumber(marker.x,locale)}, {formatNumber(marker.y,locale)}){!marker.confidence?' ≈':''}</Chip>)}{integral&&<output role="status">∫ = {Number.isFinite(integral.value)?formatNumber(integral.value,locale):'—'} · {t(integral.confidence?'graph.estimate':'graph.uncertain',locale)}{Number.isFinite(integral.errorEstimate)?` ± ${formatNumber(integral.errorEstimate,locale)}`:''}</output>}</div>}
    <div className="graph-export"><Button size="sm" variant="text" isSelected={table} onSelectedChange={setTable}>{t('graph.table',locale)}</Button><Select label={t('graph.background',locale)} selectedKey={background} onSelectionChange={key=>setBackground(String(key))} options={[{id:'theme',label:t('graph.themeBackground',locale)},{id:'transparent',label:t('graph.transparent',locale)}]} /><Button size="sm" variant="outlined" isDisabled={exporting} onPress={()=>{void exportPng(false);}}>{t('graph.export',locale)}</Button><Button size="sm" variant="text" isDisabled={exporting} onPress={()=>{void exportPng(true);}}>{t('graph.copy',locale)}</Button></div>
    {table&&<section className="graph-table-section" aria-label={t('graph.table',locale)}><div><Select label={t('graph.function',locale)} options={parsed.filter(r=>r.curve).map(r=>({id:r.row.id,label:r.row.input}))} selectedKey={selected?.row.id??null} onSelectionChange={key=>setTableId(String(key))} /><TextField label={t('graph.step',locale)} value={step} onChange={setStep} isInvalid={!Number.isFinite(Number(step))||Number(step)<=0} errorMessage={t('graph.invalidRange',locale)} /></div><p>{t('graph.tableLimit',locale)}</p><div className="graph-table-scroll"><table><thead><tr><th>{t('graph.parameter',locale)}</th><th>x</th><th>y</th></tr></thead><tbody>{tableRows.map(({u,point})=><tr key={u}><td>{formatNumber(u,locale)}</td><td>{Number.isFinite(point.x)?formatNumber(point.x,locale):'—'}</td><td>{Number.isFinite(point.y)?formatNumber(point.y,locale):'—'}</td></tr>)}</tbody></table></div></section>}</div>
    <FunctionPanel rows={parsed} colors={palette} locale={locale} dispatch={change} playing={playing} onPlay={onPlay} onAnalyze={runAnalysis} /></div>
    <Dialog title={t('graph.actions',locale)} closeLabel={t('ui.close',locale)} isOpen={!!context} onOpenChange={open=>{if(!open)setContext(null);}}><div className="graph-context">{(['roots','extrema','tangent','integral'] as const).map(kind=><Button key={kind} isDisabled={kind==='integral'&&parsed.find(r=>r.row.id===context?.id)?.curve?.kind!=='explicit'} onPress={()=>{if(context){lastTrace.current=context;runAnalysis(context.id,kind);}setContext(null);}}>{t(`graph.analysis.${kind}`,locale)}</Button>)}<Select label={t('graph.otherCurve',locale)} options={parsed.filter(r=>r.curve&&r.row.id!==context?.id).map(r=>({id:r.row.id,label:r.row.input}))} selectedKey={contextOther} onSelectionChange={key=>setContextOther(key?String(key):null)} /><Button isDisabled={!contextOther} onPress={()=>{if(context&&contextOther)runAnalysis(context.id,'intersections',contextOther);setContext(null);}}>{t('graph.analysis.intersections',locale)}</Button></div></Dialog>
  </section>;
}
