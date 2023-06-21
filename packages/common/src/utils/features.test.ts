import { safeExpect } from '@paradox/common-test';

import { Features } from './features';

describe('lte', () => {
  test('major minor revision', () => {
    safeExpect(
      Features.lteMajorMinor({ major: 3, minor: 1, revision: 0 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(true);
    safeExpect(
      Features.lteMajorMinor({ major: 3, minor: 1, revision: 1 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(true);
    safeExpect(
      Features.lteMajorMinor({ major: 3, minor: 1, revision: 2 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(false);
  });

  test('commitTime', () => {
    safeExpect(
      Features.lteMajorMinor(
        { major: 3, minor: 1, revision: 1, commitTime: 100 },
        { major: 3, minor: 1, revision: 1, commitTime: 200 }
      )
    ).toEqual(true);
    safeExpect(
      Features.lteMajorMinor(
        { major: 3, minor: 1, revision: 1, commitTime: 200 },
        { major: 3, minor: 1, revision: 1, commitTime: 100 }
      )
    ).toEqual(false);
  });

  test('fails if commitTime condition is provided but version does not contain commit time', () => {
    safeExpect(
      Features.lteMajorMinor({ major: 3, minor: 1, revision: 1 }, { major: 3, minor: 1, revision: 1, commitTime: 100 })
    ).toEqual(false);
  });
});

describe('gte', () => {
  test('major minor revision', () => {
    safeExpect(
      Features.gteMajorMinor({ major: 3, minor: 1, revision: 0 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(false);
    safeExpect(
      Features.gteMajorMinor({ major: 3, minor: 1, revision: 1 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(true);
    safeExpect(
      Features.gteMajorMinor({ major: 3, minor: 1, revision: 2 }, { major: 3, minor: 1, revision: 1 })
    ).toEqual(true);
  });

  test('commitTime', () => {
    safeExpect(
      Features.gteMajorMinor(
        { major: 3, minor: 1, revision: 1, commitTime: 200 },
        { major: 3, minor: 1, revision: 1, commitTime: 100 }
      )
    ).toEqual(true);
    safeExpect(
      Features.gteMajorMinor(
        { major: 3, minor: 1, revision: 1, commitTime: 100 },
        { major: 3, minor: 1, revision: 1, commitTime: 200 }
      )
    ).toEqual(false);
  });

  test('fails if commitTime condition is provided but version does not contain commit time', () => {
    safeExpect(
      Features.gteMajorMinor({ major: 3, minor: 1, revision: 1 }, { major: 3, minor: 1, revision: 1, commitTime: 100 })
    ).toEqual(false);
  });
});
