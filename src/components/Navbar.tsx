import { Link } from "react-router-dom";

export default function Navbar() {
    return (
    <div className="w-full bg-gray-200 border-b border-gray-400">
        <div className="max-w-7xl mx-auto flex justify-end gap-10 py-4 px-6">
            <Link to="/about" className="hover:underline">About Us</Link>
            <Link to="/faqs" className="hover:underline">FAQs</Link>
            <Link to="/contacts" className="hover:underline">Contacts</Link>
        </div>
    </div>
    );
}
