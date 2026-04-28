import BooksView from '../components/books/BooksView';

export default function AdminBooksScreen() {
  return (
    <BooksView
      workspaceLabel="Admin Workspace ▾"
      fabBottom={16}
      listPaddingBottom={96}
    />
  );
}
