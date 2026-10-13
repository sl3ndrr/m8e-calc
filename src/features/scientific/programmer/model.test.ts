import { expect, it } from 'vitest';
import { setBit, reconfigure, integerResult } from './model';
import { numberValue } from '../../../engine';
const options={width:8,signed:false,overflow:'wrap'} as const;
it('sets and clears bits without toggling already painted bits',()=>{
  expect(setBit(0n,7,true,options)).toBe(128n);
  expect(setBit(128n,7,true,options)).toBe(128n);
  expect(setBit(128n,7,false,options)).toBe(0n);
});
it('signed conversion reinterprets and resizing follows overflow',()=>{
  expect(reconfigure(255n,options,{...options,signed:true})).toBe(-1n);
  expect(reconfigure(256n,{...options,width:16},options)).toBe(0n);
  expect(()=>reconfigure(256n,{...options,width:16},{...options,overflow:'error'})).toThrow();
});
it('only exact integers synchronize from engine',()=>{
  const a=numberValue('18446744073709551615'),b=numberValue('0.5');
  expect(a.ok && integerResult(a.value)).toBe(18446744073709551615n);
  expect(b.ok && integerResult(b.value)).toBe(null);
});
