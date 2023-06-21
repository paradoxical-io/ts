import { getGitNotes, Sha } from './git';

test.skip('notes', async () => {
  const notes = await getGitNotes('2a2cbcb9b' as Sha, '07a71d431' as Sha);

  expect(notes.length).toEqual(2);
});
