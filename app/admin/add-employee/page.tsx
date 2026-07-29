// app/admin/add-employee/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ProfilePhotoUpload from '@/app/components/uploadPP';
import { getMissingRequired, isFieldRequired } from '@/app/lib/employeeFields';

// Registry-driven required lookup so the form's asterisks and native `required`
// attributes always match the central field registry.
const isRequired = isFieldRequired;

// Renders the mandatory asterisk only when the registry marks the field required.
function Req({ field }: { field: string }) {
  return isRequired(field) ? <span className="text-red-500">*</span> : null;
}

export default function AddEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    fatherName: '',
    motherName:'',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    maritalStatus: '',
    profileUrl:'',
    isUploadedtoR2:'',
    profileFilename:'',

    
    // Contact Information
    mobileNumber: '',
    alternateNumber: '',
    email: '',
    currentAddress: '',
    permanentAddress: '',
    city: '',
    state: '',
    pincode: '',
    
    // Government IDs
    aadharNumber: '',
    panNumber: '',
    
    // Employment Details
    employeeId: '',
    designation: '',
    department: '',
    joiningDate: '',
    employmentType: 'Full-time',
    reportingManager: '',
    workLocation: '',
    
    // Salary & Benefits
    basicSalary: '',
    hra: '',
    otherAllowances: '',
    pfNumber: '',
    esiNumber: '',
    uanNumber: '',
    
    // Bank Details
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactNumber: '',
    emergencyContactRelation: ''
  });

  // Organization dropdown options (from Phase 2 org entities)
  const [orgOptions, setOrgOptions] = useState<{
    departments: string[];
    designations: string[];
    locations: string[];
  }>({ departments: [], designations: [], locations: [] });

  useEffect(() => {
    (async () => {
      try {
        const [dep, des, loc] = await Promise.all([
          fetch('/api/org/departments?activeOnly=1').then((r) => r.json()),
          fetch('/api/org/designations?activeOnly=1').then((r) => r.json()),
          fetch('/api/org/locations?activeOnly=1').then((r) => r.json()),
        ]);
        setOrgOptions({
          departments: dep.success ? dep.data.map((d: any) => d.name).filter(Boolean) : [],
          designations: des.success ? des.data.map((d: any) => d.title).filter(Boolean) : [],
          locations: loc.success ? loc.data.map((l: any) => l.name).filter(Boolean) : [],
        });
      } catch (e) {
        console.error('Failed to load organization options:', e);
      }
    })();
  }, []);

  // Validate form
  const validateForm = () => {
    // Required fields (driven by the central field registry).
    const missing = getMissingRequired(formData);
    if (missing.length > 0) {
      setError(`${missing[0].label} is required`);
      return false;
    }

    // Validate Aadhar (12 digits)
    if (!/^\d{12}$/.test(formData.aadharNumber.replace(/\s+/g, ''))) {
      setError('Aadhar number must be 12 digits');
      return false;
    }

    // Validate PAN (ABCDE1234F format)
    // if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber)) {
    //   setError('PAN number format is invalid (e.g., ABCDE1234F)');
    //   return false;
    // }

    // Validate mobile number (10 digits)
    if (formData.mobileNumber.length<10) {
      setError('Mobile number must be a valid 10-digit Indian number');
      return false;
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email format is invalid');
      return false;
    }

    // Validate PIN code (6 digits)
    if (!/^\d{6}$/.test(formData.pincode)) {
      setError('PIN code must be 6 digits');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate form
    if (!validateForm()) {
        console.log(validateForm())
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Show success message for 2 seconds then redirect
        setTimeout(() => {
          router.push('/admin/search-employee');
        }, 2000);
      } else {
        setError(data.error || 'Failed to add employee. Please try again.');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      setError('Failed to add employee. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Employee Added Successfully!</h2>
          <p className="text-gray-600 text-lg mb-2">
            <strong>{formData.fullName}</strong> ({formData.employeeId})
          </p>
          <p className="text-gray-600 mb-6">
            Redirecting to employee list...
          </p>
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Employee</h1>
        <p className="text-gray-600">Register new employee with complete details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-black">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Validation Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
           <ProfilePhotoUpload onUploadSuccess={(photoUrl:string ,filename:string ,isUploadedtoR2:string)=>setFormData({ ...formData, profileUrl: photoUrl, profileFilename:filename ,isUploadedtoR2 })}/>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <Req field="fullName" />
              </label>
              <input
                type="text"
                required={isRequired('fullName')}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Father's Name <Req field="fatherName" />
              </label>
              <input
                type="text"
                required={isRequired('fatherName')}
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mother's Name <Req field="motherName" />
              </label>
              <input
                type="text"
                required={isRequired('motherName')}
                value={formData.motherName}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <Req field="dateOfBirth" />
              </label>
              <input
                type="date"
                required={isRequired('dateOfBirth')}
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender <Req field="gender" />
              </label>
              <select
                required={isRequired('gender')}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blood Group <Req field="bloodGroup" />
              </label>
              <select
                required={isRequired('bloodGroup')}
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marital Status <Req field="maritalStatus" />
              </label>
              <select
                required={isRequired('maritalStatus')}
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <Req field="mobileNumber" />
              </label>
              <input
                type="tel"
                required={isRequired('mobileNumber')}
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alternate Number <Req field="alternateNumber" />
              </label>
              <input
                type="tel"
                required={isRequired('alternateNumber')}
                value={formData.alternateNumber}
                onChange={(e) => setFormData({ ...formData, alternateNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <Req field="email" />
              </label>
              <input
                type="email"
                required={isRequired('email')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permanent Address as Per Aadhar <Req field="permanentAddress" />
              </label>
              <textarea
                required={isRequired('permanentAddress')}
                rows={2}
                value={formData.permanentAddress}
                onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Address <Req field="currentAddress" />
              </label>
              <textarea
                required={isRequired('currentAddress')}
                rows={2}
                value={formData.currentAddress}
                onChange={(e) => setFormData({ ...formData, currentAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <Req field="city" />
              </label>
              <input
                type="text"
                required={isRequired('city')}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <Req field="state" />
              </label>
              <input
                type="text"
                required={isRequired('state')}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Code <Req field="pincode" />
              </label>
              <input
                type="text"
                required={isRequired('pincode')}
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="XXXXXX"
              />
            </div>
          </div>
        </div>

        {/* Government IDs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Government IDs</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aadhar Number <Req field="aadharNumber" />
              </label>
              <input
                type="text"
                required={isRequired('aadharNumber')}
                maxLength={12}
                value={formData.aadharNumber}
                onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="XXXX XXXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number <Req field="panNumber" />
              </label>
              <input
                type="text"
                required={isRequired('panNumber')}
                maxLength={10}
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="ABCDE1234F"
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Employment Details</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Designation <Req field="designation" />
              </label>
              <select
                required={isRequired('designation')}
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Designation</option>
                {orgOptions.designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <Req field="department" />
              </label>
              <select
                required={isRequired('department')}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Department</option>
                {orgOptions.departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Joining Date <Req field="joiningDate" />
              </label>
              <input
                type="date"
                required={isRequired('joiningDate')}
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employment Type <Req field="employmentType" />
              </label>
              <select
                required={isRequired('employmentType')}
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Location <Req field="workLocation" />
              </label>
              <select
                required={isRequired('workLocation')}
                value={formData.workLocation}
                onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select Work Location</option>
                {orgOptions.locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Salary & Benefits */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Salary & Benefits</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Basic Salary <Req field="basicSalary" />
              </label>
              <input
                type="number"
                required={isRequired('basicSalary')}
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HRA <Req field="hra" />
              </label>
              <input
                type="number"
                required={isRequired('hra')}
                value={formData.hra}
                onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Allowances <Req field="otherAllowances" />
              </label>
              <input
                type="number"
                required={isRequired('otherAllowances')}
                value={formData.otherAllowances}
                onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PF Number <Req field="pfNumber" />
              </label>
              <input
                type="text"
                required={isRequired('pfNumber')}
                value={formData.pfNumber}
                onChange={(e) => setFormData({ ...formData, pfNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ESI Number <Req field="esiNumber" />
              </label>
              <input
                type="text"
                required={isRequired('esiNumber')}
                value={formData.esiNumber}
                onChange={(e) => setFormData({ ...formData, esiNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UAN Number <Req field="uanNumber" />
              </label>
              <input
                type="text"
                required={isRequired('uanNumber')}
                value={formData.uanNumber}
                onChange={(e) => setFormData({ ...formData, uanNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Bank Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name <Req field="bankName" />
              </label>
              <input
                type="text"
                required={isRequired('bankName')}
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <Req field="accountNumber" />
              </label>
              <input
                type="text"
                required={isRequired('accountNumber')}
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IFSC Code <Req field="ifscCode" />
              </label>
              <input
                type="text"
                required={isRequired('ifscCode')}
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name <Req field="branchName" />
              </label>
              <input
                type="text"
                required={isRequired('branchName')}
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name <Req field="emergencyContactName" />
              </label>
              <input
                type="text"
                required={isRequired('emergencyContactName')}
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number <Req field="emergencyContactNumber" />
              </label>
              <input
                type="tel"
                required={isRequired('emergencyContactNumber')}
                value={formData.emergencyContactNumber}
                onChange={(e) => setFormData({ ...formData, emergencyContactNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relation <Req field="emergencyContactRelation" />
              </label>
              <input
                type="text"
                required={isRequired('emergencyContactRelation')}
                value={formData.emergencyContactRelation}
                onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding Employee...
              </>
            ) : (
              'Add Employee'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
