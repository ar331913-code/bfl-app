import React, { useState, useRef } from 'react';
import { db } from '../../db';
import { Customer, CustomerType } from '../../types';
import { 
  X, 
  ArrowLeft,
  Camera, 
  CreditCard, 
  Car, 
  Store, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  FileCheck2, 
  Phone, 
  User, 
  MapPin, 
  FileText,
  Upload,
  Sparkles
} from 'lucide-react';
import { isValidGhanaCard, formatGhanaCardInput } from '../../utils/formatters';
import { CameraModal } from '../common/CameraModal';
import { SMSService } from '../../services/smsService';
import { CloudSyncService } from '../../services/cloudSyncService';
import { useAuth } from '../../context/AuthContext';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
  existingCustomer?: Customer; // For editing
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerCreated,
  existingCustomer
}) => {
  const { settings } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [customerType, setCustomerType] = useState<CustomerType>(existingCustomer?.customerType || 'driver');
  
  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState(existingCustomer?.fullName || '');
  const [primaryPhone, setPrimaryPhone] = useState(existingCustomer?.primaryPhone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(existingCustomer?.secondaryPhone || '');
  const [dateOfBirth, setDateOfBirth] = useState(existingCustomer?.dateOfBirth || '1990-01-01');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(existingCustomer?.gender || 'male');
  const [residentialAddress, setResidentialAddress] = useState(existingCustomer?.residentialAddress || '');
  const [workAddress, setWorkAddress] = useState(existingCustomer?.workAddress || '');
  
  // Step 2: Ghana Card Specifics & Photos
  const [ghanaCardNumber, setGhanaCardNumber] = useState(existingCustomer?.ghanaCardNumber || 'GHA-');
  const [photoUrl, setPhotoUrl] = useState<string>(existingCustomer?.photoUrl || '');
  const [ghanaCardFrontUrl, setGhanaCardFrontUrl] = useState<string>(existingCustomer?.ghanaCardFrontUrl || '');
  const [ghanaCardBackUrl, setGhanaCardBackUrl] = useState<string>(existingCustomer?.ghanaCardBackUrl || '');
  
  // Step 3: Driver / Trader Particulars & Operator Notes
  const [vehicleType, setVehicleType] = useState(existingCustomer?.driverDetails?.vehicleType || '');
  const [registrationNumber, setRegistrationNumber] = useState(existingCustomer?.driverDetails?.registrationNumber || '');
  const [licenseNumber, setLicenseNumber] = useState(existingCustomer?.driverDetails?.licenseNumber || '');
  const [stationLocation, setStationLocation] = useState(existingCustomer?.driverDetails?.stationLocation || '');
  
  const [businessName, setBusinessName] = useState(existingCustomer?.traderDetails?.businessName || '');
  const [businessType, setBusinessType] = useState(existingCustomer?.traderDetails?.businessType || '');
  const [marketLocation, setMarketLocation] = useState(existingCustomer?.traderDetails?.marketLocation || '');
  const [stallNumber, setStallNumber] = useState(existingCustomer?.traderDetails?.stallNumber || '');
  
  const [notes, setNotes] = useState(existingCustomer?.notes || '');

  // Validation and Submission State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Camera Viewfinder State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<'photo' | 'cardFront' | 'cardBack'>('photo');
  const [cameraTitle, setCameraTitle] = useState<string>('Take Photo');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // Hidden File Inputs for Gallery Uploads
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cardFrontInputRef = useRef<HTMLInputElement>(null);
  const cardBackInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCardInputChange = (val: string) => {
    const formatted = formatGhanaCardInput(val);
    setGhanaCardNumber(formatted);
    if (errors.ghanaCardNumber) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.ghanaCardNumber;
        return next;
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'cardFront' | 'cardBack') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'photo') setPhotoUrl(base64);
      if (type === 'cardFront') setGhanaCardFrontUrl(base64);
      if (type === 'cardBack') setGhanaCardBackUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const openLiveCamera = (type: 'photo' | 'cardFront' | 'cardBack', title: string, facing: 'user' | 'environment') => {
    setCameraTarget(type);
    setCameraTitle(title);
    setCameraFacing(facing);
    setIsCameraModalOpen(true);
  };

  const handleCameraCapture = (base64: string) => {
    if (cameraTarget === 'photo') setPhotoUrl(base64);
    if (cameraTarget === 'cardFront') setGhanaCardFrontUrl(base64);
    if (cameraTarget === 'cardBack') setGhanaCardBackUrl(base64);
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full legal name is required';
    if (!primaryPhone.trim()) newErrors.primaryPhone = 'Primary phone number is required';
    if (primaryPhone.trim().length < 9) newErrors.primaryPhone = 'Enter a valid phone number (e.g. 024XXXXXXX)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    // Non-blocking: card and photos are optional
    setErrors(prev => {
      const next = { ...prev };
      delete next.ghanaCardNumber;
      return next;
    });
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => Math.min(3, prev + 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // CRITICAL: Prevent early submit from mobile keyboard Enter/Go on Step 1 or 2
    if (step < 3) {
      handleNext();
      return;
    }
    
    if (!fullName.trim()) {
      setStep(1);
      setErrors({ fullName: 'Full legal name is required' });
      return;
    }
    if (!primaryPhone.trim() || primaryPhone.trim().length < 9) {
      setStep(1);
      setErrors({ primaryPhone: 'Valid phone number is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const customerId = existingCustomer?.customerId || await db.getNextCustomerId();
      const now = new Date().toISOString();

      const finalGhanaCard = ghanaCardNumber.trim() && ghanaCardNumber.trim() !== 'GHA-' 
        ? ghanaCardNumber.trim().toUpperCase() 
        : `GHA-${Math.floor(100000000 + Math.random() * 900000000)}-${Math.floor(Math.random() * 9)}`;

      const newCustomer: Customer = {
        customerId,
        fullName: fullName.trim(),
        dateOfBirth,
        gender,
        customerType,
        primaryPhone: primaryPhone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        residentialAddress: residentialAddress.trim() || 'Accra, Ghana',
        workAddress: workAddress.trim() || stationLocation.trim() || marketLocation.trim() || residentialAddress.trim() || 'Accra, Ghana',
        ghanaCardNumber: finalGhanaCard,
        photoUrl: photoUrl || undefined,
        ghanaCardFrontUrl: ghanaCardFrontUrl || undefined,
        ghanaCardBackUrl: ghanaCardBackUrl || undefined,
        
        driverDetails: customerType === 'driver' ? {
          vehicleType: vehicleType.trim() || 'Trotro / Taxi',
          registrationNumber: registrationNumber.trim() || 'Unregistered',
          licenseNumber: licenseNumber.trim() || 'N/A',
          stationLocation: stationLocation.trim() || workAddress.trim() || 'Local Station'
        } : undefined,

        traderDetails: customerType === 'trader' ? {
          businessName: businessName.trim() || 'Market Trade',
          businessType: businessType.trim() || 'Retail & Wholesale',
          marketLocation: marketLocation.trim() || workAddress.trim() || 'Market Center',
          stallNumber: stallNumber.trim() || undefined
        } : undefined,

        emergencyContact: existingCustomer?.emergencyContact || {
          name: 'Contact Person',
          relationship: 'Next of Kin',
          phone: secondaryPhone.trim() || primaryPhone.trim()
        },

        status: existingCustomer?.status || 'active',
        notes: notes.trim() || undefined,
        createdAt: existingCustomer?.createdAt || now,
        updatedAt: now
      };

      if (existingCustomer && existingCustomer.id) {
        await db.customers.update(existingCustomer.id, newCustomer);
        newCustomer.id = existingCustomer.id;
        await db.auditLogs.add({
          action: 'CUSTOMER_UPDATED',
          entityType: 'customer',
          entityId: customerId,
          details: `Updated dossier for ${newCustomer.fullName} (${customerId})`,
          timestamp: now
        });
      } else {
        const newId = await db.customers.add(newCustomer);
        newCustomer.id = newId;
        await db.auditLogs.add({
          action: 'CUSTOMER_REGISTERED',
          entityType: 'customer',
          entityId: customerId,
          details: `Registered ${newCustomer.fullName} (${newCustomer.customerType}) with Ghana Card PIN ${newCustomer.ghanaCardNumber}`,
          timestamp: now
        });

        // Auto-send Welcome SMS to new client
        if ((settings?.autoSmsOnRegister ?? true) && newCustomer.primaryPhone) {
          const welcomeMsg = SMSService.generateWelcomeSMS({
            customer: newCustomer,
            businessName: settings?.businessName,
            businessPhone: settings?.businessPhone
          });
          SMSService.dispatchSMS(newCustomer.primaryPhone, welcomeMsg, settings);
        }
      }

      onCustomerCreated(newCustomer);
      CloudSyncService.forcePushLocalToCloud().catch(e => console.warn('Cloud sync error:', e));
      onClose();
    } catch (err) {
      console.error('Failed to save customer', err);
      setErrors({ form: 'Failed to save customer. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCardFormatValid = isValidGhanaCard(ghanaCardNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-xl md:max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-800 text-white flex items-center justify-between border-b border-sky-400/30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (step > 1) setStep(prev => prev - 1);
                else onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-200" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-white">
                {existingCustomer ? 'Edit Client Dossier' : 'Register New Client'}
              </h2>
              <p className="text-[10px] text-sky-100 font-semibold">
                Step {step} of 3 • {step === 1 ? 'Contact Info' : step === 2 ? 'Ghana Card & Live Camera' : 'Work & Notes'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex px-5 pt-3 gap-1.5 bg-slate-50 border-b border-slate-100">
          {[
            { num: 1, label: '1. Contact' },
            { num: 2, label: '2. Ghana Card & Photo' },
            { num: 3, label: '3. Work & Notes' }
          ].map(s => (
            <div 
              key={s.num}
              onClick={() => {
                if (s.num === 1 || (s.num === 2 && validateStep1()) || (s.num === 3 && validateStep1() && validateStep2())) {
                  setStep(s.num);
                }
              }}
              className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition cursor-pointer ${
                step === s.num 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : step > s.num
                  ? 'bg-sky-100 text-blue-800'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* STEP 1: CONTACT INFO */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fade-in">
              
              {/* Category Selector */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Client Occupation / Archetype *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('driver')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition active:scale-95 ${
                      customerType === 'driver'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${customerType === 'driver' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Car className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black">Commercial Driver</div>
                      <div className="text-[10px] text-slate-500 font-medium">Trotro / Taxi / Okada</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerType('trader')}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition active:scale-95 ${
                      customerType === 'trader'
                        ? 'border-sky-600 bg-sky-50 text-blue-950 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${customerType === 'trader' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-black">Market Trader</div>
                      <div className="text-[10px] text-slate-500 font-medium">Shop / Stall Owner</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Emmanuel Boateng"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 focus:outline-none ${
                    errors.fullName ? 'border-rose-400 focus:border-rose-600 bg-rose-50/30' : 'border-slate-200 focus:border-sky-500'
                  }`}
                />
                {errors.fullName && <p className="text-[11px] text-rose-600 font-bold mt-0.5">{errors.fullName}</p>}
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Telephone *</label>
                  <input
                    type="tel"
                    placeholder="024 412 3456"
                    value={primaryPhone}
                    onChange={(e) => {
                      setPrimaryPhone(e.target.value);
                      if (errors.primaryPhone) setErrors(prev => ({ ...prev, primaryPhone: '' }));
                    }}
                    className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 focus:outline-none ${
                      errors.primaryPhone ? 'border-rose-400 focus:border-rose-600 bg-rose-50/30' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.primaryPhone && <p className="text-[11px] text-rose-600 font-bold mt-0.5">{errors.primaryPhone}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Secondary Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="055 987 6543"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Residential & Work Address */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. House No. 12, Kaneshie"
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Work / Station Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Circle Station / Makola"
                    value={workAddress}
                    onChange={(e) => setWorkAddress(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date of Birth & Gender */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: GHANA CARD DETAILS & LIVE CAMERA CAPTURE */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Ghana Card Field (Clean with no validity message) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    Ghana Card PIN
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>

                <input
                  type="text"
                  placeholder="e.g. GHA-712345678-9"
                  value={ghanaCardNumber}
                  onChange={(e) => handleCardInputChange(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-navy-950 shadow-xs"
                />
              </div>

              {/* Photos & Documents Header with Skip Option */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-black text-navy-950 uppercase tracking-wider block">
                    Photos & Documents
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Optional — You can take photo or skip</span>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-black text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95"
                >
                  <span>Skip Photos to Work & Notes</span>
                  <span>➔</span>
                </button>
              </div>

              {/* Live Camera & Photos Section */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* 1. Client Face Profile Photo */}
                <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white space-y-2 flex flex-col items-center text-center shadow-xs">
                  <div className="text-[11px] font-black text-navy-950 uppercase tracking-wider">
                    Profile Picture
                  </div>

                  {photoUrl ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border-2 border-sky-300 group">
                      <img src={photoUrl} alt="Client Face" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute bottom-1 right-1 p-1 bg-rose-600 text-white rounded-lg text-[9px] font-bold shadow-xs hover:bg-rose-700"
                        title="Remove photo"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-sky-50 border-2 border-dashed border-sky-300 flex items-center justify-center text-sky-400">
                      <Camera className="w-8 h-8 text-sky-500" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => openLiveCamera('photo', 'Snap Client Face Portrait', 'user')}
                      className="py-2 px-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-[10px] font-black rounded-xl shadow-xs flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'photo')}
                    className="hidden"
                  />
                </div>

                {/* 2. Ghana Card Front Document */}
                <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white space-y-2 flex flex-col items-center text-center shadow-xs">
                  <div className="text-[11px] font-black text-navy-950 uppercase tracking-wider">
                    Card Document
                  </div>

                  {ghanaCardFrontUrl ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border-2 border-sky-300 group">
                      <img src={ghanaCardFrontUrl} alt="Card Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGhanaCardFrontUrl('')}
                        className="absolute bottom-1 right-1 p-1 bg-rose-600 text-white rounded-lg text-[9px] font-bold shadow-xs hover:bg-rose-700"
                        title="Remove document"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-400">
                      <CreditCard className="w-8 h-8 text-blue-500" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 w-full pt-1">
                    <button
                      type="button"
                      onClick={() => openLiveCamera('cardFront', 'Snap Ghana Card Front', 'environment')}
                      className="py-2 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-[10px] font-black rounded-xl shadow-xs flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Snap Card
                    </button>

                    <button
                      type="button"
                      onClick={() => cardFrontInputRef.current?.click()}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload File
                    </button>
                  </div>

                  <input
                    ref={cardFrontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'cardFront')}
                    className="hidden"
                  />
                </div>

              </div>
            </div>
          )}

          {/* STEP 3: WORK DETAILS & OPERATOR NOTES */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              
              {customerType === 'driver' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-950 uppercase tracking-wider">
                    <Car className="w-4 h-4 text-blue-600" /> Driver & Vehicle Information
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Vehicle Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Trotro / Taxi"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Registration / Plate</label>
                      <input
                        type="text"
                        placeholder="e.g. GT 4920-21"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        className="w-full text-xs font-bold font-mono px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Station / Route Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Circle - Kaneshie Station"
                      value={stationLocation}
                      onChange={(e) => setStationLocation(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-950 uppercase tracking-wider">
                    <Store className="w-4 h-4 text-sky-600" /> Trader & Business Particulars
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Business Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mansa Wax Wholesale"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Market Stall No.</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop D-14"
                        value={stallNumber}
                        onChange={(e) => setStallNumber(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Market Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Makola Market Central"
                      value={marketLocation}
                      onChange={(e) => setMarketLocation(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Operator Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Operator Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Reliability, cashflow pattern, guarantor notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

            </div>
          )}

          {/* Errors banner */}
          {errors.form && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors.form}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>{step === 1 ? 'Next: Ghana Card & Photo (Step 2)' : 'Next: Work & Notes (Step 3)'}</span>
                <span>➔</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {existingCustomer ? 'Save Changes' : 'Complete & Register Borrower'}
              </button>
            )}
          </div>

        </form>

        {/* Live Camera Viewfinder Modal */}
        <CameraModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCapture={handleCameraCapture}
          title={cameraTitle}
          facingMode={cameraFacing}
        />

      </div>
    </div>
  );
};
