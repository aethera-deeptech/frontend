// The number of characters of a text as the API counts them, one for each code point. The length of a string counts the units
// of UTF-16, so an emoji would count twice.
export function countCharacters(value: string): number {
  let count = 0;

  for (let index = 0; index < value.length; index += 1) {
    count += 1;
    // A code point above 0xFFFF takes two units
    if ((value.codePointAt(index) ?? 0) > 0xffff) {
      index += 1;
    }
  }
  return count;
}
