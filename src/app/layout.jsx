import "react-rain-animation/lib/style.css";
import "./globals.css";

export const metadata = {
  title: "QuakePulse — Live Earthquake Radar",
  description: "Real-time pulsing earthquake map with timeline replay and auto-tour."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
