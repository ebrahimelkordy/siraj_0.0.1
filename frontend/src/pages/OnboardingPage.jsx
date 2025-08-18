import React from 'react'

import { useState } from 'react'
import useAutheUser from '../hooks/useAutheUser'
import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import toast, { LoaderIcon } from 'react-hot-toast';
import { completedOnboarding } from '../lib/api';
import { CameraIcon, MapPinIcon, ShuffleIcon } from 'lucide-react';
import { LANGUAGES, LANGUAGE_TO_FLAG, EDUCATIONAL_PATHS } from '../constants/index.js';
import { useNavigate } from 'react-router';

function OnboardingPage() {

  // هذه الصفحة مخصصة لإعدادات المستخدم الأولية بعد التسجيل
  // يمكن أن تشمل إعدادات مثل اختيار اللغة، تحميل صورة الملف الشخصي، إلخ.
  // يمكن استخدام useState أو useEffect لإدارة الحالة والبيانات هنا إذا لزم الأمر
  // يمكن أيضًا استخدام مكتبة مثل react-hook-form لإدارة النماذج بسهولة

  const { authUser } = useAutheUser();
  const queryClient = useQueryClient()
  const navigate = useNavigate();
  // استخدام هوك useAutheUser للحصول على بيانات المستخدم الحالي
  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || '',
    email: authUser?.email || '',
    phone: authUser?.phone || '',
    profilePic: authUser?.profilePic || '',
    location: authUser?.location || '',
    nativeLanguage: authUser?.nativeLanguage || '',
    educationalPath: authUser?.educationalPath || '',
    bio: authUser?.bio || '',
    gender: authUser?.gender || '',
    learningLanguage: authUser?.learningLanguage || '',
  });

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completedOnboarding,
    onSuccess: () => {
      toast.success('profile completed successfully');
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      navigate(-1); // Go back to the previous page after saving
    },
    onError: (error) => {
      toast.error(error.response.data.message || 'An error occurred during onboarding');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isOnboarded && !formState.gender) {
      toast.error('Please select your gender');
      return;
    } // Prevent page reload
    // إرسال البيانات إلى الخادم
    onboardingMutation(formState); // Send data for onboarding
    // يمكنك هنا إضافة أي معالجة إضافية بعد الإرسال
    // مثل إعادة توجيه المستخدم أو تحديث حالة التطبيق


  }
  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 1000) + 1;
    const randomAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${idx}`;
    setFormState({
      ...formState,
      profilePic: randomAvatar,
    });
    toast.success('avatar changed set successfully');
  };
  // إذا كان المستخدم أونبوردد (isOnboarded = true) نمنع تعديل الاسم والبريد والجنس والموقع
  const isOnboarded = authUser?.isOnboarded;

  return (
    <div className='min-h-screen  card flex items-center justify-center p-4'>
      <div className='card bg-base-200 w-full max-w-3xl shadow-xl'>
        <div className='card-body'>
          <h1 className='text-2xl sm:text-3xl  font-bold text-center mb-6 '>Completed Your Profile</h1>
          <form action="#" onSubmit={handleSubmit} className='space-y-6 '>
            {/* profile pic container */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {/**image preview */}
              <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CameraIcon className="size-12 text-base-content opacity-40" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-outline"
                onClick={handleRandomAvatar}
              >
                <ShuffleIcon className="size-4 text-base-content" /> Random Avatar
              </button>
            </div>
            {/* form fields */}
            <div className='form-control'>
              <label htmlFor="fullName" className="label">
                <span className="label-text">Full Name *</span>
              </label>
              <input
                type="text"
                id="fullName"
                placeholder="Your Full Name"
                value={formState.fullName}
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                className="input input-bordered w-full"
                disabled={isOnboarded}
              />
            </div>
            {/***bio */}
            <div className='form-control'>
              <label htmlFor="bio" className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                id="bio"
                placeholder="Tell us about yourself"
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className="textarea textarea-bordered w-full"
              />
            </div>
            {/* language & educational path */}
            <div className='flex flex-col lg:grid lg:grid-cols-2   gap-4'>
              {/** native language */}
              <div className='form-control'>
                <label htmlFor="nativeLanguage" className="label">
                  <span className="label-text">Native Language *</span>
                </label>
                <select
                  id="nativeLanguage"
                  value={formState.nativeLanguage}
                  onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                  className="select select-bordered w-full opacity-70"
                  disabled={isOnboarded}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={`learning-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              {/** learning language */}
              <div className='form-control'>
                <label htmlFor="learningLanguage" className="label">
                  <span className="label-text">Learning Language</span>
                </label>
                <select
                  id="learningLanguage"
                  value={formState.learningLanguage}
                  onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
                  className="select select-bordered w-full opacity-40"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={`learning-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
                {formState.learningLanguage === "other" && (
                  <input
                    type="text"
                    placeholder="Enter your language"
                    value={formState.customLearningLanguage || ""}
                    onChange={e => setFormState({ ...formState, customLearningLanguage: e.target.value })}
                    className="input input-bordered w-full mt-2"
                  />
                )}
              </div>
              {/** educational path */}
              <div className='form-control'>
                <label htmlFor="educationalPath" className="label">
                  <span className="label-text">Educational Path</span>
                </label>
                <select
                  id="educationalPath"
                  value={formState.educationalPath}
                  onChange={(e) => setFormState({ ...formState, educationalPath: e.target.value })}
                  className="select select-bordered w-full"
                >
                  {EDUCATIONAL_PATHS.map((path) => (
                    <option key={path} value={path}>
                      {path}
                    </option>
                  ))}
                </select>
                {formState.educationalPath === "other" && (
                  <input
                    type="text"
                    placeholder="Enter your educational path"
                    value={formState.customEducationalPath || ""}
                    onChange={e => setFormState({ ...formState, customEducationalPath: e.target.value })}
                    className="input input-bordered w-full mt-2"
                  />
                )}
              </div>
            </div>
            {/* LOCATION */}
            <div className="form-control flex flex-col lg:grid lg:grid-cols-2   gap-4    ">
              {/**gender */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Gender *</span>
                </label>
                <select
                  id="gender"
                  value={formState.gender}
                  onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                  className="select select-bordered w-full"
                  disabled={isOnboarded}
                >
                  <option value=""></option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>

                </select>
              </div>
              {/**location */}





              <div>

                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-10"
                    placeholder="City, Country"
                    disabled={isOnboarded}
                  /></div>
              </div>
            </div>
            {/**submit button */}
            <div className='form-control mt-6'>
              <button className="btn btn-primary w-full" disabled={isPending} type="submit">
                {!isPending ? (
                  <>
                    {isOnboarded ? 'Save Changes' : 'Complete Onboarding'}
                  </>
                ) : (
                  <>
                    <LoaderIcon className="animate-spin size-5 mr-2" />
                    {isOnboarded ? 'Saving...' : 'Onboarding...'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage