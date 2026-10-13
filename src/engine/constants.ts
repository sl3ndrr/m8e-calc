import { Guard, PI_TEXT } from './numeric.ts';
export interface ConstantDefinition {
  readonly id: string;
  readonly name: { readonly de: string; readonly en: string };
  readonly symbol: string;
  readonly value: string;
  readonly unit: string;
  readonly source: string;
  readonly exact: boolean;
  readonly uncertainty?: string;
  readonly expression?: string;
}
const source = 'https://physics.nist.gov/cuu/Constants/Table/allascii.txt';
const pi = new Guard(PI_TEXT);
function constant(
  id: string,
  de: string,
  en: string,
  symbol: string,
  value: string,
  unit: string,
  exact: boolean,
  uncertainty?: string,
  expression?: string,
): ConstantDefinition {
  return Object.freeze({
    id,
    name: Object.freeze({ de, en }),
    symbol,
    value,
    unit,
    source,
    exact,
    ...(uncertainty ? { uncertainty } : {}),
    ...(expression ? { expression } : {}),
  });
}
const definitions: readonly ConstantDefinition[] = [
  {
    ...constant('pi', 'Kreiszahl', 'Pi', 'π', PI_TEXT, '1', false),
    source: 'https://dlmf.nist.gov/4.2',
  },
  {
    ...constant(
      'e',
      'Eulersche Zahl',
      'Euler number',
      'e',
      new Guard(1).exp().toString(),
      '1',
      false,
    ),
    source: 'https://dlmf.nist.gov/4.2',
  },
  {
    ...constant(
      'phi',
      'Goldener Schnitt',
      'Golden ratio',
      'φ',
      new Guard(5).sqrt().add(1).div(2).toString(),
      '1',
      false,
    ),
    source: 'https://dlmf.nist.gov/4.2',
  },
  {
    ...constant(
      'tau',
      'Vollkreis-Konstante',
      'Full turn constant',
      'τ',
      pi.mul(2).toString(),
      '1',
      false,
    ),
    source: 'https://dlmf.nist.gov/4.2',
  },
  constant(
    'c',
    'Lichtgeschwindigkeit',
    'Speed of light',
    'c',
    '299792458',
    'm s^-1',
    true,
  ),
  constant(
    'h',
    'Planck-Konstante',
    'Planck constant',
    'h',
    '6.62607015e-34',
    'J s',
    true,
  ),
  constant(
    'hbar',
    'Reduzierte Planck-Konstante',
    'Reduced Planck constant',
    'ħ',
    new Guard('6.62607015e-34')
      .div(pi.mul(2))
      .toSignificantDigits(50)
      .toString(),
    'J s',
    true,
    undefined,
    'h/(2*pi)',
  ),
  constant(
    'qe',
    'Elementarladung',
    'Elementary charge',
    'e',
    '1.602176634e-19',
    'C',
    true,
  ),
  constant(
    'kB',
    'Boltzmann-Konstante',
    'Boltzmann constant',
    'k_B',
    '1.380649e-23',
    'J K^-1',
    true,
  ),
  constant(
    'NA',
    'Avogadro-Konstante',
    'Avogadro constant',
    'N_A',
    '6.02214076e23',
    'mol^-1',
    true,
  ),
  constant(
    'R',
    'Universelle Gaskonstante',
    'Molar gas constant',
    'R',
    '8.31446261815324',
    'J mol^-1 K^-1',
    true,
    undefined,
    'NA*kB',
  ),
  constant(
    'G',
    'Gravitationskonstante',
    'Newtonian constant of gravitation',
    'G',
    '6.67430e-11',
    'm^3 kg^-1 s^-2',
    false,
    '0.00015e-11',
  ),
  constant(
    'gn',
    'Normfallbeschleunigung',
    'Standard acceleration of gravity',
    'g_n',
    '9.80665',
    'm s^-2',
    true,
  ),
  constant(
    'epsilon0',
    'Elektrische Feldkonstante',
    'Vacuum electric permittivity',
    'ε0',
    '8.8541878188e-12',
    'F m^-1',
    false,
    '0.0000000014e-12',
  ),
  constant(
    'mu0',
    'Magnetische Feldkonstante',
    'Vacuum magnetic permeability',
    'μ0',
    '1.25663706127e-6',
    'N A^-2',
    false,
    '0.00000000020e-6',
  ),
  constant(
    'me',
    'Elektronenmasse',
    'Electron mass',
    'm_e',
    '9.1093837139e-31',
    'kg',
    false,
    '0.0000000028e-31',
  ),
  constant(
    'mp',
    'Protonenmasse',
    'Proton mass',
    'm_p',
    '1.67262192595e-27',
    'kg',
    false,
    '0.00000000052e-27',
  ),
  constant(
    'mn',
    'Neutronenmasse',
    'Neutron mass',
    'm_n',
    '1.67492750056e-27',
    'kg',
    false,
    '0.00000000085e-27',
  ),
  constant(
    'u',
    'Atomare Masseneinheit',
    'Unified atomic mass unit',
    'u',
    '1.66053906892e-27',
    'kg',
    false,
    '0.00000000052e-27',
  ),
  constant(
    'alpha',
    'Feinstrukturkonstante',
    'Fine-structure constant',
    'α',
    '7.2973525643e-3',
    '1',
    false,
    '0.0000000011e-3',
  ),
  constant(
    'sigma',
    'Stefan-Boltzmann-Konstante',
    'Stefan-Boltzmann constant',
    'σ',
    pi
      .pow(5)
      .mul(2)
      .mul(new Guard('1.380649e-23').pow(4))
      .div(
        new Guard('6.62607015e-34')
          .pow(3)
          .mul('299792458')
          .mul('299792458')
          .mul(15),
      )
      .toSignificantDigits(50)
      .toString(),
    'W m^-2 K^-4',
    true,
    undefined,
    '2*pi^5*kB^4/(15*h^3*c^2)',
  ),
  constant(
    'Rinf',
    'Rydberg-Konstante',
    'Rydberg constant',
    'R∞',
    '10973731.568157',
    'm^-1',
    false,
    '0.000012',
  ),
  constant(
    'a0',
    'Bohr-Radius',
    'Bohr radius',
    'a0',
    '5.29177210544e-11',
    'm',
    false,
    '0.00000000082e-11',
  ),
  constant(
    'muB',
    'Bohrsches Magneton',
    'Bohr magneton',
    'μB',
    '9.2740100657e-24',
    'J T^-1',
    false,
    '0.0000000029e-24',
  ),
];
export const constantRegistry: Readonly<Record<string, ConstantDefinition>> =
  Object.freeze(
    Object.fromEntries(definitions.map((d) => [d.id, Object.freeze(d)])),
  );
export const constantAliases: Readonly<Record<string, string>> = Object.freeze({
  π: 'pi',
  φ: 'phi',
  τ: 'tau',
  k_B: 'kB',
  N_A: 'NA',
  g_n: 'gn',
  m_e: 'me',
  m_p: 'mp',
  m_n: 'mn',
});
export function lookupConstant(name: string): ConstantDefinition | undefined {
  const id = Object.hasOwn(constantAliases, name)
    ? (constantAliases[name] ?? name)
    : name;
  return Object.hasOwn(constantRegistry, id) ? constantRegistry[id] : undefined;
}
