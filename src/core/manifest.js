export const isExtraSupported = (catalog, extra) => {
  const allSupported = extra.every((extraValue) =>
    catalog.extra.some((prop) => prop.name === extraValue.name)
  );
  const requiredSatisfied = catalog.extra
    .filter((prop) => prop.isRequired === true)
    .every((prop) => extra.some((extraValue) => extraValue.name === prop.name));
  return allSupported && requiredSatisfied;
};

export const catalogSupportsExtraName = (catalog, name) =>
  catalog.extra.some((prop) => prop.name === name);
