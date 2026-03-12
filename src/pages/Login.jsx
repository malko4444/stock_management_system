import React, { useEffect, useState } from "react";
import { authApi, userProfileApi } from "../services/firebaseApi";
import { Link, useNavigate } from "react-router-dom";
import navIcon from "../assets/img/navIcon.png";

function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("adminId")) navigate("/home");
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await authApi.signIn(formData.email, formData.password);
      const uid = userCredential.user.uid;
      const email = userCredential.user.email || "";
      let profile = await userProfileApi.get(uid);
      if (!profile) {
        await userProfileApi.set(uid, { email, displayName: email.split("@")[0] || "User" });
        profile = { displayName: email.split("@")[0] || "User" };
      }
      const displayName = profile.displayName || email.split("@")[0] || "User";
      localStorage.setItem("adminId", uid);
      localStorage.setItem("userDisplayName", displayName);
      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
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
      <div className="w-full max-w-sm bg-white p-8 shadow-xl rounded-2xl border border-[#E8F8F9]">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-[#108587]">Welcome Back</h2>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Access your dashboard</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-[10px] font-bold text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form autoComplete="off" className="space-y-4" onSubmit={handleSubmit}>
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
              className="block w-full px-4 py-2 text-sm border border-[#20dbdf] rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none"
            />
          </div>

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
              className="block w-full px-4 py-2 text-sm border border-[#20dbdf] rounded-lg focus:ring-4 focus:ring-[#108587]/10 focus:border-[#108587] transition-all outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="cursor-pointer w-full py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-[#108587]/20 text-sm font-black text-white bg-[#108587] hover:bg-[#0c7c6b] transition-all active:scale-[0.98]"
            >
              Log in to Account
            </button>
          </div>
        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-tight">
          New here?{" "}
          <Link to="/signup" className="text-[#108587] hover:underline ml-1">
            Create an account
          </Link>
        </div>
      </div>
    </div>
</>
  );
}

export default Login;
