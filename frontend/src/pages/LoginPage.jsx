import useLogin from '../hooks/useLogin';
import React from 'react'
import sirajLogo from '../assests/isisi.png';
import { useState } from 'react';
import { login } from '../lib/api';
import { Link } from 'react-router';
function LoginPage() {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const { loginMutation, isPending, error } = useLogin();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      loginMutation(loginData, {
        onSuccess: (response) => {
          if (response.token) {
            // Token is already set in the api.js login function
            // Redirect or perform any additional actions here
          }
        },
        onError: (err) => {
          console.error("Login failed:", err);
        }
      });
    } catch (err) {
      console.error("Login failed:", err);
    }


  }
  return (
    <div className=' bg-base-100 flex items-center justify-center p-4  sm:p-6 md:p-8'>

      <div className="w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden 
            border border-primary/25 
            grid grid-cols-1 sm:grid-cols-2">
        {/**loginform */}
        <div className=' order-2 w-full  p-4 sm:p-8 flex flex-col h-screen sm:h-auto  '>
          {/**logo */}
          <div className='mb-4 flex items-center justify-start gap-2'>
            <img src={sirajLogo} alt="logo" className="size-20" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider pt-6">
              Siraj
            </span>
          </div>
          {/**ERROR MESSAGE DISPLAY */}
          {error && (
            <div className='alert alert-error mb-4'>
              <span>{error.response.data.message}</span>
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className='space-y-4' >
              <div>
                <h2 className='text-xl font-semibold '>
                  <p className='text-sm opacity-70'>
                    Sign in to your account
                  </p>
                </h2>
              </div>
              <div className='flex flex-col gap-3'>
                <div className="form-control w-full">
                  <label htmlFor="" className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder=" ex:tawheed@example.com"
                    className="input input-bordered w-full"
                    value={loginData.email}
                    onChange={(e) => {
                      setLoginData({ ...loginData, email: e.target.value });
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
                    value={loginData.password}
                    onChange={(e) => {
                      setLoginData({ ...loginData, password: e.target.value });
                    }}

                  />
                  <button type="submit" className="btn btn-primary w-full">
                    {isPending ? (
                      <span className="loading loading-spinner loading-sm">loding...</span>
                    ) : (
                      "log in"
                    )}

                  </button>
                  <div className="text-center mt-4">
                    <p className="text-sm">
                      Dont have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>

        </div>
        <div className="flex w-full  bg-primary/10 items-center justify-center h-screen sm:h-auto">
          <div className="max-w-md p-8">
            {/* Illustration */}
            <div className="order-1 relative aspect-square max-w-sm mx-auto ">
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

  )
}

export default LoginPage  