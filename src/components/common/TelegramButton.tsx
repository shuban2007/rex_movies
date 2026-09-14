import './TelegramButton.css';
import TelegramLogo from '../../assets/TelegramLogo.png';

export function TelegramButton() {
  return (
    <a 
      href="https://t.me/+S7o2RiET3ac2NTQ1?utm_source=chatgpt.com"
      target="_blank"
      rel="noopener noreferrer"
      className="telegram-floating-btn"
      aria-label="Join our Telegram Channel"
    >
      <img src={TelegramLogo} alt="Telegram Logo" className="telegram-icon-img" />
    </a>
  );
}
