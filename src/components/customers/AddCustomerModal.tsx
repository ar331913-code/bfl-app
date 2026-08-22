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
  FileText
} from 'lucide-react';
import { isValidGhanaCard, formatGhanaCardInput } from '../../utils/formatters';

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File Inputs Ref
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cardFrontInputRef = useRef<HTMLInputElement>(null);
  const cardBackInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'photo' | 'cardFront' | 'cardBack') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'photo') setPhotoUrl(reader.result as string);
        if (target === 'cardFront') setGhanaCardFrontUrl(reader.result as string);
        if (target === 'cardBack') setGhanaCardBackUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardInputChange = (val: string) => {
    const formatted = formatGhanaCardInput(val);
    setGhanaCardNumber(formatted);
    if (errors.ghanaCardNumber) {
      setErrors(prev => ({ ...prev, ghanaCardNumber: '' }));
    }
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
    const newErrors: Record<string, string> = {};
    const cardTrimmed = ghanaCardNumber.trim();
    if (!cardTrimmed || cardTrimmed === 'GHA-') {
      newErrors.ghanaCardNumber = 'Ghana Card PIN is required';
    } else if (!isValidGhanaCard(cardTrimmed)) {
      newErrors.ghanaCardNumber = 'Format should match GHA-XXXXXXXXX-X';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(prev => Math.min(3, prev + 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Minimum validation: Name and Phone
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

      // Ensure Ghana card has proper fallback if partially entered
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
          vehicleType: vehicleType.trim() || 'Commercial Trotro / Taxi',
          registrationNumber: registrationNumber.trim() || 'GT 0000-24',
          licenseNumber: licenseNumber.trim() || `DL-${customerId.replace('CUST-', '')}`,
          stationLocation: stationLocation.trim() || 'Central Station'
        } : undefined,
        traderDetails: customerType === 'trader' ? {
          businessName: businessName.trim() || `${fullName}'s Enterprise`,
          businessType: businessType.trim() || 'General Trade',
          marketLocation: marketLocation.trim() || 'Makola Market',
          stallNumber: stallNumber.trim() || undefined
        } : undefined,
        emergencyContact: {
          name: existingCustomer?.emergencyContact?.name || 'Self / Primary',
          relationship: existingCustomer?.emergencyContact?.relationship || 'Self',
          phone: existingCustomer?.emergencyContact?.phone || primaryPhone.trim()
        },
        status: existingCustomer?.status || 'active',
        notes: notes.trim() || undefined,
        createdAt: existingCustomer?.createdAt || now,
        updatedAt: now
      };

      if (existingCustomer?.id) {
        await db.customers.update(existingCustomer.id, newCustomer);
      } else {
        await db.customers.add(newCustomer);
      }

      await db.auditLogs.add({
        action: existingCustomer ? 'CUSTOMER_UPDATED' : 'CUSTOMER_REGISTERED',
        entityType: 'customer',
        entityId: customerId,
        details: `${existingCustomer ? 'Updated' : 'Registered new'} client ${fullName} (${customerId}) with Ghana Card ${finalGhanaCard}`,
        timestamp: now
      });

      onCustomerCreated(newCustomer);
      onClose();
    } catch (err) {
      console.error('Failed to save customer', err);
      setErrors({ form: 'Failed to save customer.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCardFormatValid = isValidGhanaCard(ghanaCardNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between border-b border-sky-400/30">
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
                {existingCustomer ? 'Edit Client Profile' : 'Register New Client'}
              </h2>
              <p className="text-[10px] text-sky-100 font-semibold">
                Step {step} of 3 • {step === 1 ? 'Personal Info' : step === 2 ? 'Ghana Card & Photo' : 'Work & Notes'}
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

        {/* Step Navigation Tabs (3 Clean Steps without Guarantor) */}
        <div className="grid grid-cols-3 bg-sky-50/80 p-1 border-b border-sky-100 text-xs font-black">
          {[
            { num: 1, label: '1. Contact Info' },
            { num: 2, label: '2. Ghana Card' },
            { num: 3, label: customerType === 'driver' ? '3. Driver Details' : '3. Trader Details' },
          ].map(t => (
            <button
              key={t.num}
              type="button"
              onClick={() => setStep(t.num)}
              className={`py-2 text-center rounded-xl transition ${
                step === t.num 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-sky-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* STEP 1: Personal & Contact Information */}
          {step === 1 && (
            <div className="space-y-3.5 animate-fade-in">
              
              {/* Category Selector */}
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Client Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('driver')}
                    className={`py-2.5 px-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-black transition ${
                      customerType === 'driver' 
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Car className="w-4 h-4 text-blue-600" />
                    Commercial Driver
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerType('trader')}
                    className={`py-2.5 px-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-black transition ${
                      customerType === 'trader' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    Market Trader
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Emmanuel Mensah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
                {errors.fullName && <p className="text-[11px] text-rose-600 font-bold mt-0.5">{errors.fullName}</p>}
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Phone (MoMo) *</label>
                  <input
                    type="tel"
                    placeholder="024 123 4567"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                  {errors.primaryPhone && <p className="text-[11px] text-rose-600 font-bold mt-0.5">{errors.primaryPhone}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Secondary Phone</label>
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

          {/* STEP 2: GHANA CARD DETAILS & PHOTO CAPTURE */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-50 border-2 border-sky-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    Ghana Card PIN (GHA-XXXXXXXXX-X) *
                  </span>
                  {isCardFormatValid ? (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3 h-3" /> Valid Card PIN
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Format: GHA-XXXXXXXXX-X
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="GHA-712345678-9"
                    value={ghanaCardNumber}
                    onChange={(e) => handleCardInputChange(e.target.value)}
                    className="w-full text-sm font-mono font-black px-3.5 py-3 rounded-xl border-2 border-sky-300 focus:border-sky-600 focus:outline-none tracking-widest bg-white text-navy-950 shadow-inner"
                  />
                </div>

                {errors.ghanaCardNumber && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.ghanaCardNumber}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!ghanaCardNumber.startsWith('GHA-')) {
                        setGhanaCardNumber('GHA-' + ghanaCardNumber.replace(/[^0-9]/g, ''));
                      }
                    }}
                    className="text-[11px] font-bold text-sky-700 hover:underline"
                  >
                    Prefix with GHA-
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium">9 digits + 1 check digit</span>
                </div>
              </div>

              {/* Photo & Card Image Upload Cards */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* 1. Customer Face Photo */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-sky-200 bg-slate-50 hover:bg-sky-50/50 transition relative overflow-hidden">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'photo')}
                    className="hidden"
                  />
                  {photoUrl ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden group shadow-sm">
                      <img src={photoUrl} alt="Client Face" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="absolute inset-0 bg-navy-950/70 text-white text-[10px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        Change Face Photo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex flex-col items-center text-center p-2"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center mb-1.5 shadow-md">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-black text-slate-800">Client Face Photo</span>
                      <span className="text-[9px] text-slate-400 font-medium">Snap or upload</span>
                    </button>
                  )}
                </div>

                {/* 2. Ghana Card Front Document */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-sky-200 bg-slate-50 hover:bg-sky-50/50 transition relative overflow-hidden">
                  <input
                    ref={cardFrontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'cardFront')}
                    className="hidden"
                  />
                  {ghanaCardFrontUrl ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden group shadow-sm">
                      <img src={ghanaCardFrontUrl} alt="Ghana Card Front" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => cardFrontInputRef.current?.click()}
                        className="absolute inset-0 bg-navy-950/70 text-white text-[10px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        Change Front
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cardFrontInputRef.current?.click()}
                      className="flex flex-col items-center text-center p-2"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-md">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-black text-slate-800">Ghana Card (Front)</span>
                      <span className="text-[9px] text-slate-400 font-medium">Snap front side</span>
                    </button>
                  )}
                </div>

              </div>

              {/* 3. Ghana Card Back */}
              <div className="p-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-between">
                <input
                  ref={cardBackInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'cardBack')}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-navy-950">Ghana Card (Back)</div>
                    <div className="text-[10px] text-slate-400">{ghanaCardBackUrl ? 'Card back attached' : 'Optional document attachment'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cardBackInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs"
                >
                  {ghanaCardBackUrl ? 'Replace' : 'Upload Back'}
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Archetype Particulars & Operator Notes */}
          {step === 3 && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                {customerType === 'driver' ? <Car className="w-4 h-4 text-blue-600" /> : <Store className="w-4 h-4 text-emerald-600" />}
                {customerType === 'driver' ? 'Driver Station & Vehicle Particulars' : 'Trader Market & Store Particulars'}
              </div>

              {customerType === 'driver' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Type / Model</label>
                    <input
                      type="text"
                      placeholder="e.g. Trotro (Toyota HiAce) / Taxi (Hyundai i10)"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Plate / Reg No.</label>
                      <input
                        type="text"
                        placeholder="e.g. GT 4920-21"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                        className="w-full text-xs font-mono font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Driver License No.</label>
                      <input
                        type="text"
                        placeholder="e.g. DL-2015-ACC-9842"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                        className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Station / Lorry Park Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Kaneshie Station / Circle Neoplan"
                      value={stationLocation}
                      onChange={(e) => setStationLocation(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Business / Store Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Mansa Fabrics & GTP Wholesale"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Type of Trade / Goods</label>
                      <input
                        type="text"
                        placeholder="e.g. Textiles / Provisions / Shoes"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Stall / Shed Number</label>
                      <input
                        type="text"
                        placeholder="e.g. Stall D-14"
                        value={stallNumber}
                        onChange={(e) => setStallNumber(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Market Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Makola Market Central / Agbogbloshie"
                      value={marketLocation}
                      onChange={(e) => setMarketLocation(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Operator Risk Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Operator Notes</label>
                <textarea
                  rows={2}
                  placeholder="Client background, route consistency, shop lease duration..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {errors.form && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errors.form}
                </div>
              )}
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              {/* Quick Save Option */}
              {step < 3 && fullName.trim() && primaryPhone.trim() && (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="px-3.5 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold transition"
                >
                  Quick Save
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black shadow-md transition"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black shadow-md active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {existingCustomer ? 'Update Client' : 'Save & Register Client'}
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
