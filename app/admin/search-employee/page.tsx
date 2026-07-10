// app/admin/search-employee/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Loader2, Download, Eye, Edit, Trash2, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface Employee {
  fullName: string;
  employeeId: string;
  designation: string;
  department: string;
  city: string;
  state: string;
  gender: string;
  joiningDate: string;
  mobileNumber: string;
  email: string;
  aadharNumber: string;
  panNumber: string;
  status: string;
  workLocation: string;
}

export default function SearchEmployeePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'aadharNumber'>('name');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  // Filter states
  const [filters, setFilters] = useState({
    workLocation: '',
    state: '',
    gender: '',
    department: '',
    designation: '',
    status: '',
    joiningDateFrom: '',
    joiningDateTo: ''
  });

  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  // Pagination state (server-side, 50 per page)
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter dropdown options (distinct values fetched from server)
  const [filterOptions, setFilterOptions] = useState<{
    workLocations: string[];
    states: string[];
    departments: string[];
    designations: string[];
  }>({ workLocations: [], states: [], departments: [], designations: [] });

  // Fetch first page + filter dropdown options on load
  useEffect(() => {
    loadFilterOptions();
    loadEmployees(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch distinct values for the filter dropdowns (does not load all rows)
  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/employees?meta=filters');
      const data = await response.json();
      if (data.success && data.filters) {
        setFilterOptions(data.filters);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Build query params from the current search + filter state for a given page
  const buildParams = (targetPage: number) => {
    const params = new URLSearchParams();
    params.append('page', String(targetPage));
    params.append('limit', String(PAGE_SIZE));
    if (searchQuery.trim()) {
      params.append('search', searchQuery);
      params.append('searchBy', searchBy);
    }
    if (filters.workLocation) params.append('workLocation', filters.workLocation);
    if (filters.state) params.append('state', filters.state);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.department) params.append('department', filters.department);
    if (filters.designation) params.append('designation', filters.designation);
    return params;
  };

  // Core loader: runs the query for the given params and updates the table + pagination
  const runQuery = async (params: URLSearchParams) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/employees?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setFilteredEmployees(data.data);
        setTotal(data.total ?? data.data.length);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? 1);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  };

  const loadEmployees = (targetPage = 1) => runQuery(buildParams(targetPage));

  // Search functionality (resets to first page)
  const handleSearch = () => {
    loadEmployees(1);
  };

  // Apply filters (resets to first page)
  const applyFilters = () => {
    loadEmployees(1);
    setShowFilters(false);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      workLocation: '',
      state: '',
      gender: '',
      department: '',
      designation: '',
      status: '',
      joiningDateFrom: '',
      joiningDateTo: ''
    });
    setSearchQuery('');
    // Reset to an unfiltered first page (don't read the just-reset state, build fresh params)
    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('limit', String(PAGE_SIZE));
    runQuery(params);
  };

  // Change page (keeps current search + filters)
  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || isSearching) return;
    loadEmployees(targetPage);
  };

  // Filter dropdown options (from server distinct values)
  const uniqueCities = filterOptions.workLocations;
  const uniqueStates = filterOptions.states;
  const uniqueDepartments = filterOptions.departments;
  const uniqueDesignations = filterOptions.designations;

  // View employee details
  const handleViewDetails = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  //view Id card
   const openIdCard = (employee: any) => {
    setSelectedEmployee(employee);
    setIsIdModalOpen(true);
  };

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Employee ID', 'Name', 'Designation', 'Department', 'City', 'Gender', 'Joining Date', 'Mobile', 'Status'].join(','),
      ...filteredEmployees.map(emp => [
        emp.employeeId,
        emp.fullName,
        emp.designation,
        emp.department,
        emp.city,
        emp.gender,
        emp.joiningDate,
        emp.mobileNumber,
        emp.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Employee</h1>
        <p className="text-gray-600">Find and manage employee records</p>
      </div>

      {/* Search Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-black">
        <div className="flex flex-col gap-4">
          {/* Search By Toggle */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchBy"
                value="name"
                checked={searchBy === 'name'}
                onChange={(e) => setSearchBy('name')}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-gray-700 font-medium">Search by Name</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchBy"
                value="id"
                checked={searchBy === 'aadharNumber'}
                onChange={(e) => setSearchBy('aadharNumber')}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-gray-700 font-medium">Search by Aadhar No.</span>
            </label>
          </div>

          {/* Search Input */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={searchBy === 'name' ? 'Enter employee name...' : 'Enter employee ID...'}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold disabled:bg-gray-300 flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-black">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Filter Employees</h2>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
              <select
                value={filters.workLocation}
                onChange={(e) => setFilters({ ...filters, workLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Work Location</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Living States</option>
                {uniqueStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Designation Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <select
                value={filters.designation}
                onChange={(e) => setFilters({ ...filters, designation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Designations</option>
                {uniqueDesignations.map(des => (
                  <option key={des} value={des}>{des}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-4">
            <button
              onClick={applyFilters}
              className="flex-1 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700 font-semibold"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Search Results ({total})
            </h2>
            <p className="text-gray-600 text-sm">
              {total === 0
                ? 'No employees found'
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </p>
          </div>
          {/* <button
            onClick={handleExport}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button> */}
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Aadhar No.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Work Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Gender</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Joining Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No employees found matching your search criteria
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.aadharNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {employee.aadharNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{employee.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.designation}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.workLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.gender}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{employee.joiningDate}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {employee.status}
                      </span>
                    </td>
                   <td colSpan={2} className="px-4 py-3 whitespace-nowrap w-full"> 
                      <div className="flex w-full items-center justify-center gap-2"> 
                        <button onClick={() => handleViewDetails(employee)} className="p-2 hover:bg-gray-100 rounded-lg" title="View Details" > 
                          <Eye className="w-4 h-4 text-gray-600" /> 
                        </button> 
                        <button onClick={() => openIdCard(employee)} className="bg-amber-600 text-slate-100 px-2 py-1 text-sm rounded-lg hover:bg-amber-700 whitespace-nowrap" >
                          View ID Card
                        </button>
                        <a href={`/admin/edit-employee/${employee.employeeId}`} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </a>
                        {/* <button className="p-2 hover:bg-gray-100 rounded-lg" title="Delete" > <Trash2 className="w-4 h-4 text-red-600" /> </button>  */}
                      </div> 
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isSearching}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isSearching}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      {/* Id card */}
      <IDCardModal 
        isOpen={isIdModalOpen} 
        onClose={() => setIsIdModalOpen(false)} 
        employee={selectedEmployee} 
      />
    </div>
  );
}


function EmployeeDetailsModal({
  employee,
  onClose,
}: {
  employee: any;
  onClose: () => void;
}) {


  const DetailRow = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex justify-between border-b border-gray-200 py-2">
      <p className="text-gray-600 text-sm w-1/2">{label}</p>
      <p className="text-gray-900 font-medium w-1/2 text-right">{value || '—'}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{employee.fullName}</h2>
            <p className="text-sm text-gray-500">{employee.employeeId}</p>
          </div>
          <div className="flex gap-2">
            <DownloadEmppdf employee={employee}/>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div id="employee-pdf-content" className="p-6 bg-gray-50">
          {/* Logo and Title */}
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Company Logo"
              width={60}
              height={60}
              className="rounded-full border border-gray-300"
            />
          </div>
          <h1 className="text-center text-lg font-bold mb-2 text-gray-900">
            Sachin Security Services Pvt. Ltd.
          </h1>
          <p className="text-center text-sm text-gray-600 mb-6">
            Employee Details Report
          </p>

          {/* Profile Photo */}
          <div className="flex justify-center mb-6">
            <Image
              src={employee.profileUrl || '/api/download/profile/default'}
              alt="Profile"
              width={120}
              height={120}
              className="rounded-lg border border-gray-300 object-cover"
              unoptimized
            />
          </div>

          {/* Personal Details */}
          <Section title="Personal Information">
            <DetailRow label="Full Name" value={employee.fullName} />
            <DetailRow label="Father's Name" value={employee.fatherName} />
            <DetailRow label="Mother's Name" value={employee.motherName} />
            <DetailRow label="Date of Birth" value={employee.dateOfBirth} />
            <DetailRow label="Gender" value={employee.gender} />
            <DetailRow label="Blood Group" value={employee.bloodGroup} />
            <DetailRow label="Marital Status" value={employee.maritalStatus} />
            <DetailRow label="Mobile Number" value={employee.mobileNumber} />
            <DetailRow label="Alternate Number" value={employee.alternateNumber} />
            <DetailRow label="Email" value={employee.email} />
          </Section>

          {/* Address Details */}
          <Section title="Address Details">
            <DetailRow label="Current Address" value={employee.currentAddress} />
            <DetailRow label="Permanent Address as per Aadhar" value={employee.permanentAddress} />
            <DetailRow label="City" value={employee.city} />
            <DetailRow label="State" value={employee.state} />
            <DetailRow label="Pincode" value={employee.pincode} />
          </Section>

          {/* Employment Details */}
          <Section title="Employment Details">
            <DetailRow label="Designation" value={employee.designation} />
            <DetailRow label="Department" value={employee.department} />
            <DetailRow label="Joining Date" value={employee.joiningDate} />
            <DetailRow label="Employment Type" value={employee.employmentType} />
            <DetailRow label="Reporting Manager" value={employee.reportingManager} />
            <DetailRow label="Work Location" value={employee.workLocation} />
            <DetailRow label="Status" value={employee.status} />
          </Section>

          {/* Salary & Benefits */}
          <Section title="Salary & Benefits">
            <DetailRow label="Basic Salary" value={employee.basicSalary} />
            <DetailRow label="HRA" value={employee.hra} />
            <DetailRow label="Other Allowances" value={employee.otherAllowances} />
            <DetailRow label="PF Number" value={employee.pfNumber} />
            <DetailRow label="ESI Number" value={employee.esiNumber} />
            <DetailRow label="UAN Number" value={employee.uanNumber} />
          </Section>

          {/* Bank Details */}
          <Section title="Bank Information">
            <DetailRow label="Bank Name" value={employee.bankName} />
            <DetailRow label="Account Number" value={employee.accountNumber} />
            <DetailRow label="IFSC Code" value={employee.ifscCode} />
            <DetailRow label="Branch Name" value={employee.branchName} />
          </Section>

          {/* Emergency Contact */}
          <Section title="Emergency Contact">
            <DetailRow label="Contact Name" value={employee.emergencyContactName} />
            <DetailRow label="Contact Number" value={employee.emergencyContactNumber} />
            <DetailRow label="Relation" value={employee.emergencyContactRelation} />
          </Section>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
            <p>Generated on {new Date().toLocaleDateString('en-IN')}</p>
            <p>Official record of Sachin Security Services Pvt. Ltd.</p>
          </div>
        </div>

        {/* Close Button */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={onClose}
            className="w-full border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <h3 className="text-base font-semibold text-gray-900 mb-3 border-b pb-2">
        {title}
      </h3>
      <div className="divide-y divide-gray-200">{children}</div>
    </div>
  );
}


import jsPDF from 'jspdf';

function DownloadEmppdf({
  employee
}: {
  employee: any;
}) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;

      // 1. सबसे ऊपर Logo जोड़ें (public/logo.png से)
      try {
        // लोगो को बेस64 में बदल कर PDF में जोड़ रहे हैं
        const logoData = await toBase64('/logo.png');
        // x: 14, y: 10, width: 25, height: 25 (आप साइज बदल सकते हैं)
        pdf.addImage(logoData, 'PNG', 14, 10, 25, 25); 
      } catch (logoErr) {
        console.error("Logo लोड करने में दिक्कत आई:", logoErr);
      }

      // 2. Header Text (लोगो के बगल में सेट किया गया)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      // नाम को बीच में रखने के बजाय थोड़ा दाईं तरफ खिसकाया है
      pdf.text('Sachin Security Services', (pageWidth / 2) + 10, 20, { align: 'center' });
      pdf.setFontSize(11);
      pdf.text('Employee Details Slip', (pageWidth / 2) + 10, 28, { align: 'center' });

      // Employee Photo (दाहिनी तरफ)
      if (employee.profileUrl) {
        try {
          const imgData = await compressImage(employee.profileUrl, 400, 0.7);
          pdf.addImage(imgData, 'JPEG', 160, 42, 30, 30); // y को थोड़ा नीचे (42) किया है
        } catch {}
      }

      // Basic Info (y की शुरुआत 40 के बजाय 45 से की है ताकि लोगो से न टकराए)
      let y = 45;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11); // फॉन्ट साइज रीसेट किया
      pdf.text('Personal Details', 14, y);
      pdf.setLineWidth(0.2);
      pdf.line(14, y + 1, 150, y + 1);
      y += 8;

      const addRow = (label: string, value: string) => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(label, 14, y);
        pdf.text(':', 70, y);
        pdf.text(value || '-', 75, y);
        y += 7;
      };

      addRow('Full Name', employee.fullName);
      addRow("Father's Name", employee.fatherName);
      addRow('Date of Birth', employee.dateOfBirth);
      addRow('Gender', employee.gender);
      addRow('Blood Group', employee.bloodGroup);
      addRow('Mobile', employee.mobileNumber);
      addRow('Email', employee.email);
      addRow('Address', employee.permanentAddress);
      addRow('', employee.city +' - '+ employee.pincode +' , '+ employee.state);

      // Employment
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Employment Details', 14, y);
      pdf.line(14, y + 1, 196, y + 1);
      y += 8;
      addRow('Employee ID', employee.employeeId);
      addRow('Designation', employee.designation);
      addRow('Department', employee.department);
      addRow('Joining Date', employee.joiningDate);
      addRow('Aadhar No.', employee.aadharNumber);
      addRow('PAN', employee.panNumber);
      addRow('PF Number', employee.pfNumber);
      addRow('UAN', employee.uanNumber);
      addRow('ESI No.', employee.esiNumber);
      addRow('Employment Type', employee.employmentType);
      addRow('Work Location', employee.workLocation);

      // Salary
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Salary & Bank Details', 14, y);
      pdf.line(14, y + 1, 196, y + 1);
      y += 8;
      addRow('Basic Salary', employee.basicSalary);
      // addRow('HRA', employee.hra);
      // addRow('Other Allowances', employee.otherAllowances);
      // addRow('Bank Name', employee.bankName);
      // addRow('A/C Number', employee.accountNumber);
      // addRow('IFSC Code', employee.ifscCode);
      // addRow('Branch', employee.branchName);

      // Emergency Contact
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Emergency Contact', 14, y);
      pdf.line(14, y + 1, 196, y + 1);
      y += 8;
      addRow('Name', employee.emergencyContactName);
      addRow('Number', employee.emergencyContactNumber);
      addRow('Relation', employee.emergencyContactRelation);

      // Footer
      y += 10;
      pdf.setFontSize(9);
      pdf.setTextColor(100);
      pdf.text(
        `Generated on ${new Date().toLocaleDateString('en-IN')} | Official Record`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );

      pdf.save(`${employee.fullName.replace(/\s+/g, '_')}_Slip.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const toBase64 = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  return (
    <button
        onClick={handleDownloadPDF}
        disabled={isGeneratingPDF}
        className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 flex items-center gap-2"
    >
        {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        PDF
    </button>
  );
}

import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { createPortal } from "react-dom";


interface IDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

// इमेज को कैनवास से डाउनस्केल + JPEG कंप्रेस करता है ताकि PDF/प्रिंट का साइज छोटा रहे।
// प्रोफाइल फोटो अक्सर 3-6MB की होती है; कार्ड/स्लिप पर उसे इतनी हाई-रेस की जरूरत नहीं।
async function compressImage(url: string, maxSize = 400, quality = 0.7): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  // blob से बना bitmap कैनवास को taint नहीं करता (CORS सुरक्षित)
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return url;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

// दोनों तरफ के ID कार्ड (फ्रंट + बैक) - स्क्रीन प्रीव्यू और प्रिंट पोर्टल दोनों में इस्तेमाल होते हैं
function IdCardFaces({ employee, qrSrc, profileImg }: { employee: any; qrSrc: string; profileImg: string }) {
  return (
    <>
      {/* 1. FRONT SIDE (सामने का भाग) */}
      <div className="id-card w-[3.375in] h-[2.125in] bg-white border border-gray-300 rounded-xl shadow-md relative flex flex-col justify-between overflow-hidden text-black font-sans select-none shrink-0">
        {/* टॉप बार (लोगो के साथ) */}
        <div className="bg-zinc-900 text-white px-2 py-1.5 flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-6 h-6 rounded-full bg-white p-0.5 object-contain shrink-0"
          />
          <div className="flex-1 text-center pr-6">
            <h1 className="text-[10px] font-bold uppercase tracking-wider leading-tight">Sachin Security Services</h1>
            <p className="text-[6.5px] text-gray-300 tracking-wide uppercase mt-0.5">Identity Card</p>
          </div>
        </div>

        {/* फोटो, मुख्य जानकारी और QR कोड */}
        <div className="flex p-2.5 gap-2 items-center flex-1">
          {/* प्रोफाइल फोटो */}
          <div className="w-12 h-16 bg-gray-100 border border-zinc-400 rounded overflow-hidden shrink-0 shadow-sm">
            {profileImg ? (
              <img src={profileImg} alt="Emp Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400 bg-gray-50">No Image</div>
            )}
          </div>

          {/* डिटेल्स */}
          <div className="text-left leading-tight overflow-hidden flex-1 min-w-0">
            <h2 className="text-[11px] font-bold text-zinc-900 uppercase truncate">{employee.fullName}</h2>
            <p className="text-[8.5px] font-semibold text-amber-600 mb-0.5 truncate">{employee.designation}</p>

            <p className="text-[7.5px] text-gray-600 truncate"><span className="font-bold text-gray-700">Emp Id:</span> {employee.employeeId}</p>
            <p className="text-[7.5px] text-gray-600 truncate"><span className="font-bold text-gray-700">DOJ:</span> {employee.joiningDate || 'N/A'}</p>
            <p className="text-[7.5px] text-gray-600 truncate"><span className="font-bold text-gray-700">Location:</span> {employee.workLocation || 'N/A'}</p>
            <p className="text-[7.5px] text-gray-600 truncate"><span className="font-bold text-gray-700">Blood Gp:</span> {employee.bloodGroup || 'N/A'}</p>
            <p className="text-[7.5px] text-gray-600 truncate"><span className="font-bold text-gray-700">Mobile:</span> {employee.mobileNumber}</p>
          </div>

          {/* QR कोड (दाईं तरफ) */}
          <div className="shrink-0 flex flex-col items-center">
            {qrSrc && (
              <img src={qrSrc} alt="Verification QR" className="w-[46px] h-[46px] border border-gray-200 rounded" />
            )}
            <p className="text-[5px] text-gray-500 mt-0.5 uppercase tracking-wide text-center leading-none">Scan to<br />verify</p>
          </div>
        </div>

        {/* बॉटम डिजाइन लाइन */}
        <div className="bg-amber-600 h-1.5 w-full"></div>
      </div>

      {/* 2. BACK SIDE (पीछे का भाग - कंपनी विवरण के साथ) */}
      <div className="id-card w-[3.375in] h-[2.125in] bg-zinc-900 border border-zinc-800 rounded-xl shadow-md relative flex flex-col justify-between p-3 text-white font-sans select-none shrink-0">

        {/* हेडर: लोगो और कंपनी नाम */}
        <div className="flex items-center justify-center gap-2 border-b border-white/10 pb-1.5">
          <img
            src="/logo.png"
            alt="Company Logo"
            className="w-6 h-6 rounded-full bg-white p-0.5 object-contain shrink-0"
          />
          <h3 className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">Sachin Security Services</h3>
        </div>

        {/* कंपनी संपर्क विवरण */}
        <div className="text-center px-1">
          <p className="text-[6.5px] font-bold text-white uppercase tracking-wider">Corporate Office</p>
          <p className="text-[6.5px] text-gray-300 mt-0.5 leading-snug">
            410, 411, Oneindiabulls, Nr. Jetalpur Over Bridge,<br />
            Jetalpur, Vadodara - 390007
          </p>
          <p className="text-[6.5px] text-gray-300 mt-1 leading-snug">
            +91 6357889701 &nbsp;|&nbsp; info@sachinsecurity.co.in<br />
            www.sachinsecurity.co.in
          </p>
        </div>

        {/* निर्देश (1-2 लाइन) */}
        <p className="text-[6px] text-gray-400 text-center px-2 leading-normal">
          This card is the property of Sachin Security Services and is non-transferable. If found, please return it to the corporate office above.
        </p>

        {/* सिग्नेचर एरिया */}
        <div className="flex justify-between items-end text-[7.5px] px-1 text-gray-400">
          <p className="border-t border-gray-600 pt-1 px-1">Authorized Signatory</p>
          <p className="font-mono text-[7px] text-amber-500">{employee.employeeId}</p>
        </div>
      </div>
    </>
  );
}

function IDCardModal({ isOpen, onClose, employee }: IDCardModalProps) {
  const [qrSrc, setQrSrc] = useState<string>("");
  const [profileImg, setProfileImg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  // पोर्टल केवल क्लाइंट पर रेंडर करें (SSR पर document उपलब्ध नहीं होता)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !employee) return;

    setLoading(true);
    setProfileImg("");
    // लाइव वेरिफिकेशन के लिए QR कोड का लिंक तैयार करें (एन्क्रिप्टेड टोकन के साथ)
    const profileLink = `${window.location.origin}/employees/${employee.idToken}`;

    (async () => {
      try {
        // QR कोड और कंप्रेस्ड प्रोफाइल फोटो साथ-साथ तैयार करें
        const [qr, img] = await Promise.all([
          QRCode.toDataURL(profileLink, { width: 200, margin: 1 }),
          employee.profileUrl
            ? compressImage(employee.profileUrl, 300, 0.7).catch(() => employee.profileUrl)
            : Promise.resolve(""),
        ]);
        setQrSrc(qr);
        setProfileImg(img);
      } catch (err) {
        console.error("ID card asset error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, employee]);

  // अगर मॉडल ओपन नहीं है या कर्मचारी का डेटा नहीं है तो कुछ न दिखाएं
  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print(); // सिर्फ ID कार्ड प्रिंट करने के लिए ब्राउज़र का प्रिंटर खोलें
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-black">
      {/* मॉडल का मुख्य बॉक्स (सिर्फ स्क्रीन प्रीव्यू के लिए) */}
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative border border-gray-200 animate-in fade-in zoom-in-95 duration-200">

        {/* मॉडल का हेडर */}
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h3 className="text-lg font-bold text-gray-900">Employee ID Card</h3>
          <div className="flex items-center gap-3">
            {/* प्रिंट बटन */}
            <button
              onClick={handlePrint}
              disabled={loading}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-amber-700 transition text-sm font-medium disabled:bg-gray-400"
            >
              <Printer className="w-4 h-4" /> Print ID Card
            </button>
            {/* क्लोज बटन */}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* लोडिंग स्टेट */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-amber-600 w-8 h-8" />
          </div>
        ) : (
          /* ID कार्ड्स का स्क्रीन प्रीव्यू */
          <div className="flex flex-wrap justify-center gap-6">
            <IdCardFaces employee={employee} qrSrc={qrSrc} profileImg={profileImg} />
          </div>
        )}
      </div>

      {/* प्रिंट-ओनली पोर्टल: यह <body> का डायरेक्ट चाइल्ड बनता है, इसलिए प्रिंट करते समय
          बाकी पूरा पेज (टेबल, फिल्टर, मॉडल) आसानी से हटाया जा सकता है और सिर्फ कार्ड्स प्रिंट होते हैं */}
      {mounted && !loading && createPortal(
        <div id="id-print-portal">
          <IdCardFaces employee={employee} qrSrc={qrSrc} profileImg={profileImg} />
        </div>,
        document.body
      )}

      {/* प्रिंट CSS: बाकी पेज को display:none करता है (सिर्फ visibility:hidden नहीं, जिससे 30+ खाली पेज बनते थे)।
          कार्ड्स को उनके असली फिजिकल साइज (स्टैंडर्ड CR80: 3.375in x 2.125in) में एक सामान्य शीट पर प्रिंट करता है,
          जिन पर कट-गाइड (डैश्ड बॉर्डर) होते हैं - ताकि प्रिंट करके सीधे काटकर इस्तेमाल किया जा सके */}
      <style jsx global>{`
        /* प्रिंट पोर्टल स्क्रीन पर नहीं दिखता */
        #id-print-portal {
          display: none;
        }

        @media print {
          /* सामान्य शीट (डिफ़ॉल्ट A4/Letter) पर छोटे मार्जिन के साथ प्रिंट - कार्ड असली साइज में रहते हैं */
          @page {
            margin: 12mm;
          }

          /* पूरे ऐप को प्रिंट से हटाएं, सिर्फ कार्ड पोर्टल दिखाएं */
          body > *:not(#id-print-portal) {
            display: none !important;
          }

          #id-print-portal {
            display: block !important;
          }

          /* हर कार्ड बिल्कुल असली ID कार्ड साइज में, कट-गाइड के साथ */
          #id-print-portal .id-card {
            width: 3.375in !important;
            height: 2.125in !important;
            margin: 0 0 6mm 0 !important;
            border: 1px dashed #999 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* बैकग्राउंड कलर (डार्क बैक, एम्बर बार, लोगो) प्रिंट में बने रहें */
          #id-print-portal,
          #id-print-portal * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
