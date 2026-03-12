import React, { useState } from "react";
import { authApi, userProfileApi } from "../services/firebaseApi";
import { Link, useNavigate } from "react-router-dom";
import navIcon from "../assets/img/navIcon.png";

function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const userCredential = await authApi.signUp(formData.email, formData.password);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email || "";
      const displayName = formData.displayName?.trim() || email.split("@")[0] || "User";
      await userProfileApi.set(uid, { email, displayName });
      localStorage.setItem("adminId", uid);
      localStorage.setItem("userDisplayName", displayName);
      setSuccess("Signup successful! Redirecting...");
      setTimeout(() => navigate("/home"), 2000);
      setFormData({ email: "", password: "", confirmPassword: "", displayName: "" });
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed");
    }
  };

  return (
   <>
    <nav className="bg-white flex justify-center px-4 sm:px-6 lg:px-8 border-b border-gray-200 py-3.5">
        <div className="flex items-center gap-2.5">
          <img className="h-8 w-8" src={navIcon} alt="Logo" />
          <span className="text-2xl font-bold text-[#108587] leading-tight">Stockease</span>
        </div>
      </nav>
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md bg-white p-8 shadow-xl rounded-2xl border border-[#E8F8F9]">
        {/* Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[#108587]">Create Account</h2>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold font-sans">Join the ecosystem</p>
        </div>
        
        {/* Error / Success Messages */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Signup Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-bold text-[#108587] uppercase tracking-tight mb-1 px-1"
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@stockease.com"
              className="block w-full px-4 py-2.5 text-sm border border-[#20dbdf] rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="displayName"
              className="block text-[10px] font-bold text-[#108587] uppercase tracking-tight mb-1 px-1"
            >
              Display Name (optional)
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="How we'll greet you"
              className="block w-full px-4 py-2.5 text-sm border border-[#20dbdf] rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-bold text-[#108587] uppercase tracking-tight mb-1 px-1"
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="block w-full px-4 py-2.5 text-sm border border-[#20dbdf] rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-[10px] font-bold text-[#108587] uppercase tracking-tight mb-1 px-1"
              >
                Confirm
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className={`block w-full px-4 py-2.5 text-sm border rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none ${
                  formData.password &&
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                    ? "border-red-400"
                    : "border-[#20dbdf]"
                }`}
              />
            </div>
          </div>
          {formData.password &&
            formData.confirmPassword &&
            formData.password !== formData.confirmPassword && (
              <p className="text-red-500 text-[10px] font-bold mt-1 px-1 uppercase tracking-tight">Passwords do not match</p>
            )}

          <div className="pt-4">
            <button
              type="submit"
              className="cursor-pointer w-full py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-[#108587]/20 text-sm font-black text-white bg-[#108587] hover:bg-[#0e6f70] transition-all active:scale-[0.98]"
            >
              Initialize Account
            </button>
          </div>
        </form>


        {/* Login Link */}
        <div className="mt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-tight">
          Already have an account?{" "}
          <Link to="/login" className="text-[#108587] hover:underline ml-1">
            Log in here
          </Link>
        </div>
      </div>
    </div>
   </>
  );
}

export default Signup;
