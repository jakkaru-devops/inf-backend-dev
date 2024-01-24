export const convertObjectKeysToArray = (obj: object): string[] | number[] => {
  const result = [];
  Object.keys(obj).map((key, i) => {
    result[i] = key;
  });
  return result;
};