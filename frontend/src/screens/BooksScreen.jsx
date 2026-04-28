import BooksView from '../components/books/BooksView';

export default function BooksScreen() {
  return (
    <BooksView
      workspaceLabel="Personal Workspace ▾"
      fabBottom={80}
      listPaddingBottom={130}
      showBottomNav
    />
  );
}
