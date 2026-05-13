import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Back arrow + "Back to Radar" link navigating to /home.
 *
 * @param {Object} props
 * @param {string} [props.label]
 */
export default function AdminBackLink({ label = 'Back to Radar' }) {
  return (
    <Link
      to="/home"
      className="mb-4 flex items-center gap-1.5 min-h-[44px] px-2 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
