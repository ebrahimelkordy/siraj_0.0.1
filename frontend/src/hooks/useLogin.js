import React from 'react'
import { login } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
function useLogin() {
  const queryClient = useQueryClient();
  const { mutate,
    isPending,
    error
  } = useMutation({
    mutationFn: login,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["authUser"] })
  });
  return { mutate, isPending, error, loginMutation: mutate };;
}

export default useLogin