import React from 'react'
import { logout } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const useLogout = () => {

    const { mutate: logoutMutation } = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            useQueryClient.invalidateQueries({ queryKey: ['authUser'] },
                window.location.reload()
            )
        },
        onError: () => {
            useQueryClient.invalidateQueries({ queryKey: ['authUser'] });
        },
    })
    return { logoutMutation, }
}

export default useLogout