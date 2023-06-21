import { AppVersion } from '@paradoxical-io/types';

type PieceComparison = '>' | '=' | '<';

interface ComparedPieced {
  major: PieceComparison;
  minor: PieceComparison;
  revision: PieceComparison;
}

export class AppVersions {
  static lessThan(version: AppVersion, otherVersion: AppVersion): boolean {
    const pieces = AppVersions.pieces(version, otherVersion);

    // major is less than so the entire version is less than
    if (pieces.major === '<') {
      return true;
    }

    // major is greater than so the entire version is greater than
    if (pieces.major === '>') {
      return false;
    }

    // It's now known that the majors are equal

    // minor is less than so the entire version is less than
    if (pieces.minor === '<') {
      return true;
    }

    // minor is greater than so the entire version is greater than
    if (pieces.minor === '>') {
      return false;
    }

    // It's now known that both majors and minors are equal

    // if revision is less than the entire version is less than, otherwise it's not
    return pieces.revision === '<';
  }

  static greaterThan(version: AppVersion, otherVersion: AppVersion): boolean {
    const pieces = AppVersions.pieces(version, otherVersion);

    // major is greater than so the entire version is greater than
    if (pieces.major === '>') {
      return true;
    }

    // major is less than so the entire version is less than
    if (pieces.major === '<') {
      return false;
    }

    // It's now known that the majors are equal

    // minor is greater than so the entire version is greater than
    if (pieces.minor === '>') {
      return true;
    }

    // minor is less than so the entire version is less than
    if (pieces.minor === '<') {
      return false;
    }

    // It's now known that both majors and minors are equal

    // if revision is greater than the entire version is greater than, otherwise it's not
    return pieces.revision === '>';
  }

  static equals(version: AppVersion, otherVersion: AppVersion): boolean {
    const pieces = AppVersions.pieces(version, otherVersion);

    return pieces.major === '=' && pieces.minor === '=' && pieces.revision === '=';
  }

  private static pieces(version: AppVersion, otherVersion: AppVersion): ComparedPieced {
    return {
      major: AppVersions.comparePiece(version.major, otherVersion.major),
      minor: AppVersions.comparePiece(version.minor, otherVersion.minor),
      revision: AppVersions.comparePiece(version.revision, otherVersion.revision),
    };
  }

  private static comparePiece(piece?: number, otherPiece?: number): '>' | '=' | '<' {
    // The undefined cases could really go either way (and could check either first) but for now deciding that if otherPiece is undefined, piece is greater.
    // Then check if piece is undefined. If it is, otherPiece is greater.
    if (otherPiece === undefined) {
      return '>';
    }

    if (piece === undefined) {
      return '<';
    }

    if (piece > otherPiece) {
      return '>';
    }

    if (piece === otherPiece) {
      return '=';
    }

    return '<';
  }
}
