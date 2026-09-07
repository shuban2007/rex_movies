import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <p>This page doesn't exist.</p>
        <Link to="/browse" className="back-to-browse-btn">
          Back to Browse
        </Link>
      </div>
    </div>
  );
}
