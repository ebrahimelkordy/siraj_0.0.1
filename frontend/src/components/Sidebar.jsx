import React from 'react'
import useAutheUser from '../hooks/useAutheUser'
import { Link, useLocation } from 'react-router'
import sirajLogo from '../assests/isisi.png';
import { BellIcon, HomeIcon, UsersIcon, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUserNotifications } from '../lib/notifications';

function Sidebar() {
  const { authUser } = useAutheUser()
  const location = useLocation()
  const currentPath = location.pathname;

  // جلب عدد الإشعارات غير المقروءة
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getUserNotifications,
  });
  const notificationsCount = notifications.filter(n => !n.read).length;

  return (

    <aside className="w-50 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">

      <div className="p-5 border-b border-base-300">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={sirajLogo} alt="" className='size-12' />
          <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
            Siraj
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          to="/"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/" ? "btn-active" : ""
            }`}
        >
          <HomeIcon className="size-5 text-base-content opacity-70" />
          <span>Home</span>
        </Link>
        <Link
          to="/friends"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/friends" ? "btn-active" : ""
            }`}
        >
          <UsersIcon className="size-5 text-base-content opacity-70" />
          <span>Friends</span>
        </Link>
        <Link
          to="/groups"
          className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${currentPath === "/groups" ? "btn-active" : ""}`}
        >
          <Layers className="size-5 text-base-content opacity-70" />
          <span>Groups</span>
        </Link>
        {/* Notifications item - English, Lucide BellIcon, live badge */}
        <Link to="/notifications" className="btn btn-ghost justify-start w-full gap-3 px-3 normal-case flex items-center">
          <span className="indicator">
            <BellIcon className="size-5 text-base-content opacity-70" />
            {notificationsCount > 0 && (
              <span className="indicator-item badge badge-error badge-xs">{notificationsCount}</span>
            )}
          </span>
          <span>Notifications</span>
        </Link>




      </nav>
      {/* USER PROFILE SECTION */}
      <div className="p-4 border-t border-base-300 mt-auto">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{authUser?.fullName}</p>
            <p className="text-xs text-success flex items-center gap-1">
              <span className="size-2 rounded-full bg-success inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>


    </aside>
  )
}

export default Sidebar