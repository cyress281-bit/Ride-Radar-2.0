import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AdminBackLink({ label = 'Admin' }) {
  return (
    <Link to="/admin" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> {label}
    </Link>
  );
}