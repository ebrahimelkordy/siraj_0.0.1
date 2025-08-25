import axios from 'axios';

const login = async () => {
    try {
        const response = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'test@example.com',  // استخدم بريد إلكتروني حقيقي من قاعدة البيانات
            password: 'correct_password'   // استخدم كلمة مرور صحيحة
        });
        console.log('Login successful:', response.data);
    } catch (error) {
        console.error('Error logging in:', error.response?.data || error.message);
    }
};

login();
