import React, { useEffect, useState } from 'react'
import "@stream-io/video-react-sdk/dist/css/styles.css";
import {
  CallControls,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  CallingState,
  useCallStateHooks,
  SpeakerLayout,
  name,
  useCall,
} from "@stream-io/video-react-sdk";
import { useParams, useNavigate } from 'react-router';
import useAutheUser from '../hooks/useAutheUser';
import { getStreamToken } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLoader from '../components/PageLoader';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

function CallPage() {
  const { id: callId } = useParams()
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const { authUser } = useAutheUser();
  const navigate = useNavigate();

  const { data: tokenData } = useQuery({
    queryKey: ['streamToken'],
    queryFn: getStreamToken,
    enabled: !!authUser
  });



  const initCall = async () => {
    if (!tokenData || !tokenData.token || !authUser || !callId) {
      toast.error('Could not get call token. Please try again.');
      setIsConnecting(false);
      return;
    }

    try {
      const user = {
        id: authUser._id,
        name: authUser.fullName,
        image: authUser.profilePic,
      };

      const videoClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user,
        token: tokenData.token,
        options: {
          rtcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
          },
        },
      });

      const callInstance = videoClient.call("default", callId, {
        video: {
          enabled: true,
          deviceId: undefined,
          fallback: true,
          constraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        },
        audio: {
          enabled: true,
          deviceId: undefined,
        },
        members: [{
          user_id: authUser._id,
          role: 'admin'
        }]
      });

      // مراقبة أحداث التسجيل
      callInstance.on("call.recording_started", (event) => {
        console.log("Recording started:", event);
        setIsRecording(true);
        toast.success('تم بدء التسجيل');
      });

      callInstance.on("call.recording_stopped", (event) => {
        console.log("Recording stopped:", event);
        setIsRecording(false);
        toast.success('تم إيقاف التسجيل');
      });

      callInstance.on("call.recording_ready", (event) => {
        console.log("Recording ready:", event);
        setRecordings((prev) => [...prev, event.call_recording]);
        toast.success('التسجيل جاهز للتحميل');
      });

      callInstance.on('camera.error', (error) => {
        console.error('Camera error:', error);
        if (error.message.includes('Device in use')) {
          toast.error('الكاميرا قيد الاستخدام. يرجى إغلاق التطبيقات الأخرى');
        } else {
          toast.error('حدث خطأ في الكاميرا');
        }
      });

      callInstance.on('connection.error', (error) => {
        console.error('Connection error:', error);
        if (error.message.includes('ICE Candidate')) {
          toast.error('مشكلة في الاتصال. يرجى التحقق من اتصال الإنترنت');
        }
      });

      try {
        await callInstance.join({ create: true });
        console.log("joined call successfully");
        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        if (error.message.includes('permission')) {
          toast.error("لا تملك الصلاحيات الكافية للانضمام للمكالمة");
        } else if (error.message.includes('ICE')) {
          toast.error("مشكلة في الاتصال. يرجى التحقق من اتصال الإنترنت");
        } else {
          toast.error("فشل الاتصال. يرجى المحاولة مرة أخرى");
        }
        window.close();
      }

    } catch (error) {
      console.error("error initializing call ", error);
      toast.error('فشل الاتصال. يرجى المحاولة مرة أخرى');
      window.close();
    } finally {
      setIsConnecting(false);
    }
  };

  // بدء التسجيل بالتخزين الافتراضي


  // إيقاف التسجيل


  // جلب التسجيلات المحفوظة
  const fetchRecordings = async () => {
    if (!call) return;
    try {
      const response = await call.queryRecordings();
      setRecordings(response.recordings);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast.error('فشل في جلب التسجيلات');
    }
  };
  useEffect(() => {
    const initCall = async () => {
      if (!tokenData.token || !authUser || !callId) return;

      try {
        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);

        await callInstance.join({ create: true });

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);

      }
    };

    initCall();
  }, [tokenData, authUser, callId]);

  if (isConnecting) return <PageLoader />;

  return (
    <div className="h-screen">
      {client && call ? (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <CallContent
              recordings={recordings}
              fetchRecordings={fetchRecordings}

            />
          </StreamCall>
        </StreamVideo>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg mb-4">فشل الاتصال بالمكالمة</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CallContent = ({ recordings, fetchRecordings }) => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const navigate = useNavigate();
  const [showRecordings, setShowRecordings] = useState(false);

  if (callingState === CallingState.LEFT) {
    navigate("/");
    return null;
  }

  // دالة حذف تسجيل (تحتاج دعم من باك اند أو من Stream API إذا متاح)


  return (
    <StreamTheme>
      <div className="relative h-screen">
        <SpeakerLayout />
        {/* زر عرض قائمة التسجيلات */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => {
              fetchRecordings();
              setShowRecordings(!showRecordings);
            }}
            className="btn btn-primary"
          >
            عرض التسجيلات
          </button>
          {showRecordings && (
            <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm max-h-80 overflow-y-auto z-50 border border-gray-200">
              <h3 className="font-bold mb-2 text-gray-800">التسجيلات المحفوظة</h3>
              {recordings.length === 0 ? (
                <p className="text-gray-500">لا توجد تسجيلات</p>
              ) : (
                <div className="space-y-2">
                  {recordings.map((recording, index) => (
                    <div key={index} className="border rounded p-2 flex flex-col gap-1">
                      <p className="text-sm text-gray-600">
                        التسجيل {index + 1}
                      </p>
                      {recording.created_at && (
                        <p className="text-xs text-gray-400">
                          التاريخ: {new Date(recording.created_at).toLocaleString('ar-EG')}
                        </p>
                      )}
                      {recording.duration && (
                        <p className="text-xs text-gray-400">
                          المدة: {Math.floor(recording.duration / 60)}:{('0' + (recording.duration % 60)).slice(-2)} دقيقة
                        </p>
                      )}
                      {recording.url && (
                        <a
                          href={recording.url}
                          download
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          تحميل التسجيل
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <CallControls onLeave={() => window.close()} />
        </div>
        {callingState === CallingState.JOINING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>جاري الاتصال...</p>
            </div>
          </div>
        )}
      </div>
    </StreamTheme>
  );
};

export default CallPage