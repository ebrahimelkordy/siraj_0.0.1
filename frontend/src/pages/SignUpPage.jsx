import React, { useState } from 'react';                    // مكتبة React وهوك useState لإدارة الحالة
import { Link } from 'react-router';                        // لإنشاء روابط التنقل
import sirajLogo from '../assests/isisi.png';              // صورة الشعار
import { useQueryClient } from '@tanstack/react-query';     // لإدارة حالة التطبيق وتحديث البيانات

import { useMutation } from '@tanstack/react-query';       // لإدارة عمليات تعديل البيانات
import { signup } from '../lib/api';                        // دالة التسجيل التي تتواصل مع الباك اند

function SignUpPage() {
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const queryClient = useQueryClient();
  const { mutate: signupMutation, isPending, error } = useMutation({
    mutationFn: signup,            // دالة API للتسجيل
    onSuccess: () => {            // عند نجاح التسجيل
      queryClient.invalidateQueries({ queryKey: ['authUser'] }); // تحديث حالة المستخدم
    },
  });
  const handleSignup = (e) => {
    e.preventDefault();           // منع إعادة تحميل الصفحة

    // إرسال البيانات إلى الخادم
    signupMutation(signupData);  // إرسال البيانات للتسجيل
  };

  return (
    <div className="h-screen flex items-center p-4 sm:p-6 md:p-8" >
      <div className="border border-primary/25 flex w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">
        {/* sign up form - left side */}
        <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col">
          {/* logo */}
          <div className="mb-4 flex item-center justify-start gap-2">
            <img src={sirajLogo} alt="logo" className="size-20" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider pt-6">
              Siraj
            </span>
          </div>
          {/* ERROR MESSAGE IF ANY */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error.response.data.message}</span>
            </div>
          )}
          <div className="w-full">
            <form action="#" onSubmit={handleSignup}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold">Create an Account</h2>
                  <p className="text-sm opacity-70">Join us and start your journey with Siraj</p>
                </div>
                <div className="space-y-3">
                  <div className="form-control w-full">
                    <label htmlFor="" className="label">
                      <span className="label-text">Full Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      className="input input-bordered w-full"
                      value={signupData.fullName}
                      onChange={(e) => {
                        setSignupData({ ...signupData, fullName: e.target.value });
                      }}

                    />
                  </div>
                  <div className="form-control w-full">
                    <label htmlFor="" className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder=" ex:tawheed@example.com"
                      className="input input-bordered w-full"
                      value={signupData.email}
                      onChange={(e) => {
                        setSignupData({ ...signupData, email: e.target.value });
                      }}

                    />
                  </div>
                  <div className="form-control w-full">
                    <label htmlFor="" className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Your Password"
                      className="input input-bordered w-full"
                      value={signupData.password}
                      onChange={(e) => {
                        setSignupData({ ...signupData, password: e.target.value });
                      }}

                    />
                    <p>password must be at least 6 characters</p>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input type="checkbox" className="checkbox checkbox-sm" required />
                      <span className="text-xs leading-tight">
                        I agree to the{" "}
                        <span className="text-primary hover:underline">terms of service</span> and{" "}
                        <span className="text-primary hover:underline">privacy policy</span>
                      </span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  {isPending ? (
                    <span className="loading loading-spinner loading-sm">loding...</span>
                  ) : (
                    "create account"
                  )}

                </button>
                <div className="text-center mt-4">
                  <p className="text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
        {/* image - right side */}
        <div className="flex w-full lg:w-1/2 bg-primary/10 items-center justify-center">
          <div className="max-w-md p-8">
            {/* Illustration */}
            <div className="relative aspect-square max-w-sm mx-auto">
              <img src={sirajLogo} alt="Language connection illustration" className="w-full h-full  drop-shadow-[0_0_60px_rgba(255,140,0,0.5)]" />
            </div>

            <div className="text-center space-y-3 mt-6">
              <h2 className="text-xl font-semibold">Light your learning journey with Siraj  connect, chat, and grow together.</h2>
              <p className="opacity-70">
                Practice conversations, make friends, and improve your iducation skills together
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;