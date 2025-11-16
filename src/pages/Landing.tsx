import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full">
      <Navbar />

      <div className="max-w-7xl mx-auto grid grid-cols-2 h-[90%]">

        {/* LEFT SIDE */}
        <div className="flex flex-col justify-center px-12">
          <h1 className="text-4xl font-semibold mb-4">FishLERS</h1>

          <p className="text-gray-700 max-w-sm mb-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>

          <button
            className="btn btn-outline w-32"
            onClick={() => navigate("/login")}
          >
            Log In
          </button>
        </div>

        {/* DIVIDER */}
        <div className="border-l border-gray-400 relative">

          {/* RIGHT IMAGE PLACEHOLDER */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0">
              <div className="absolute inset-0 border border-gray-400"></div>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line x1="0" y1="0" x2="100" y2="100" stroke="black" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="black" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
