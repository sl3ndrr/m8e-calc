// NIST CODATA 2022, https://physics.nist.gov/cuu/Constants/Table/allascii.txt
// Independently transcribed 2026-10-13. prefix=true denotes a published ellipsis.
export const codata2022 = [
  { id: 'c', value: '299792458', exact: true },
  { id: 'h', value: '6.62607015e-34', exact: true },
  { id: 'hbar', value: '1.054571817', exact: true, prefix: true },
  { id: 'qe', value: '1.602176634e-19', exact: true },
  { id: 'kB', value: '1.380649e-23', exact: true },
  { id: 'NA', value: '6.02214076e23', exact: true },
  { id: 'R', value: '8.314462618', exact: true, prefix: true },
  { id: 'G', value: '6.67430e-11', exact: false, uncertainty: '0.00015e-11' },
  { id: 'gn', value: '9.80665', exact: true },
  {
    id: 'epsilon0',
    value: '8.8541878188e-12',
    exact: false,
    uncertainty: '0.0000000014e-12',
  },
  {
    id: 'mu0',
    value: '1.25663706127e-6',
    exact: false,
    uncertainty: '0.00000000020e-6',
  },
  {
    id: 'me',
    value: '9.1093837139e-31',
    exact: false,
    uncertainty: '0.0000000028e-31',
  },
  {
    id: 'mp',
    value: '1.67262192595e-27',
    exact: false,
    uncertainty: '0.00000000052e-27',
  },
  {
    id: 'mn',
    value: '1.67492750056e-27',
    exact: false,
    uncertainty: '0.00000000085e-27',
  },
  {
    id: 'u',
    value: '1.66053906892e-27',
    exact: false,
    uncertainty: '0.00000000052e-27',
  },
  {
    id: 'alpha',
    value: '7.2973525643e-3',
    exact: false,
    uncertainty: '0.0000000011e-3',
  },
  { id: 'sigma', value: '5.670374419', exact: true, prefix: true },
  {
    id: 'Rinf',
    value: '10973731.568157',
    exact: false,
    uncertainty: '0.000012',
  },
  {
    id: 'a0',
    value: '5.29177210544e-11',
    exact: false,
    uncertainty: '0.00000000082e-11',
  },
  {
    id: 'muB',
    value: '9.2740100657e-24',
    exact: false,
    uncertainty: '0.0000000029e-24',
  },
] as const;
