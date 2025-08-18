// مسارات إدارة الحظر
router.post('/:groupId/ban', auth, banUser);
router.delete('/:groupId/ban/:userId', auth, unbanUser);
router.get('/:groupId/banned', auth, getBannedUsers); 