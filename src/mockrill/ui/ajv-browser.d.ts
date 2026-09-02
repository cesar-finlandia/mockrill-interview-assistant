// ajv ships CJS subpaths that NodeNext resolution cannot type-resolve ("ajv/dist/2020").
// Only the constructor identity matters here — browserNodeCompat hands the module straight
// back to the chassis, which types it itself.
declare module "ajv/dist/2020" {
  const Ajv2020: unknown;
  export default Ajv2020;
}
