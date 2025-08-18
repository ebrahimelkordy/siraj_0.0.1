import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupById, leaveGroup, deleteGroup } from '../lib/api';

export const useGroups = () => {
  const queryClient = useQueryClient();

  const getGroup = async (groupId) => {
    try {
      const response = await getGroupById(groupId);
      return response.data;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  };

  const leaveGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const response = await leaveGroup(groupId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId) => {
      const response = await deleteGroup(groupId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
    },
  });

  return {
    getGroupById: getGroup,
    leaveGroup: leaveGroupMutation.mutate,
    deleteGroup: deleteGroupMutation.mutate,
  };
}; 