import React from 'react'
import { useQuery } from '@tanstack/react-query';
import { getAuthUser } from '../lib/api.js';
function useAutheUser() {
    const authUser = useQuery({
        queryKey: ['authUser'],
        queryFn: getAuthUser,

        retry: false // عدد المحاولات لإعادة الاستعلام في حالة الفشل
    });
    return {
        authUser: authUser.data?.user,
        isLoading: authUser.isLoading,
        error: authUser.error,
    }
}

export default useAutheUser