"use client";

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useConsole } from '../contexts/ConsoleContext';
import { checkCredits, createJob, fetchJobStatus } from '../../../actions/account-creation';
import { useTransition } from 'react';

interface Country {
  code: string;
  name: string;
  currency: string;
  region: string;
}

interface AccountConfig {
  region: string;
  currency: string;
}

const countries: Country[] = [
  // North America
  { code: 'US', name: 'United States', currency: 'USD', region: 'North America' },
  { code: 'CA', name: 'Canada', currency: 'CAD', region: 'North America' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', region: 'North America' },
  // South America
  { code: 'BR', name: 'Brazil', currency: 'BRL', region: 'South America' },
  { code: 'CL', name: 'Chile', currency: 'CLP', region: 'South America' },
  { code: 'CO', name: 'Colombia', currency: 'COP', region: 'South America' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', region: 'South America' },
  { code: 'PE', name: 'Peru', currency: 'PEN', region: 'South America' },
  // Europe
  { code: 'AT', name: 'Austria', currency: 'EUR', region: 'Europe' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', region: 'Europe' },
  { code: 'CZ', name: 'Czechia', currency: 'CZK', region: 'Europe' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', region: 'Europe' },
  { code: 'FI', name: 'Finland', currency: 'EUR', region: 'Europe' },
  { code: 'FR', name: 'France', currency: 'EUR', region: 'Europe' },
  { code: 'DE', name: 'Germany', currency: 'EUR', region: 'Europe' },
  { code: 'GR', name: 'Greece', currency: 'EUR', region: 'Europe' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', region: 'Europe' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', region: 'Europe' },
  { code: 'IT', name: 'Italy', currency: 'EUR', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', region: 'Europe' },
  { code: 'NO', name: 'Norway', currency: 'NOK', region: 'Europe' },
  { code: 'PL', name: 'Poland', currency: 'PLN', region: 'Europe' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', region: 'Europe' },
  { code: 'RO', name: 'Romania', currency: 'RON', region: 'Europe' },
  { code: 'ES', name: 'Spain', currency: 'EUR', region: 'Europe' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', region: 'Europe' },
  // Asia
  { code: 'KH', name: 'Cambodia', currency: 'KHR', region: 'Asia' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', region: 'Asia' },
  { code: 'IL', name: 'Israel', currency: 'ILS', region: 'Asia' },
  { code: 'JP', name: 'Japan', currency: 'JPY', region: 'Asia' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', region: 'Asia' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', region: 'Asia' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', region: 'Asia' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', region: 'Asia' },
  { code: 'TH', name: 'Thailand', currency: 'THB', region: 'Asia' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', region: 'Asia' },
  // Middle East
  { code: 'KW', name: 'Kuwait', currency: 'KWD', region: 'Middle East' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', region: 'Middle East' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', region: 'Middle East' },
  // Africa
  { code: 'EG', name: 'Egypt', currency: 'EGP', region: 'Africa' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', region: 'Africa' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', region: 'Africa' },
  // Oceania
  { code: 'AU', name: 'Australia', currency: 'AUD', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', region: 'Oceania' },
];

const regions = ['North America', 'South America', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania'];

// Get default currency for a country code
const getDefaultCurrency = (countryCode: string): string => {
  const country = countries.find(c => c.code === countryCode);
  return country?.currency || 'USD';
};

export default function CreationForm() {
  const { showError, showSuccess } = useToast();
  const { addMessage, setActive, clearMessages } = useConsole();
  const [isPending, startTransition] = useTransition();
  const [bcsAmount, setBcsAmount] = useState<number>(5);
  const [bcsInputValue, setBcsInputValue] = useState<string>('5');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [regionCurrencyPairs, setRegionCurrencyPairs] = useState<AccountConfig[]>(() => {
    // Default: one pair (US/USD)
    return [{ region: 'US', currency: 'USD' }];
  });
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isPairsDropdownOpen, setIsPairsDropdownOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [showCurrencySelection, setShowCurrencySelection] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [isCheckingCredits, setIsCheckingCredits] = useState(false);
  
  // Restore job state from localStorage when component mounts
  const [currentJobId, setCurrentJobId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('hoot_current_job_id');
    } catch {
      return null;
    }
  });
  
  const [isPolling, setIsPolling] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('hoot_is_polling') === 'true';
    } catch {
      return false;
    }
  });
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const pairsDropdownRef = useRef<HTMLDivElement>(null);

  // Verify restored job state on mount
  useEffect(() => {
    const verifyRestoredState = async () => {
      if (!currentJobId || !isPolling) return;
      
      const storedJobId = typeof window !== 'undefined' ? localStorage.getItem('hoot_current_job_id') : null;
      if (storedJobId !== currentJobId) return;
      
      try {
        const result = await fetchJobStatus(currentJobId);
        if (result.success && result.status) {
          const status = result.status;
          if (status.status === 'completed' || status.status === 'failed') {
            setIsPolling(false);
            setActive(false);
            setCurrentJobId(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('hoot_current_job_id');
              localStorage.removeItem('hoot_is_polling');
            }
          }
        } else {
          setIsPolling(false);
          setActive(false);
          setCurrentJobId(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hoot_current_job_id');
            localStorage.removeItem('hoot_is_polling');
          }
        }
      } catch (error) {
        setIsPolling(false);
        setActive(false);
        setCurrentJobId(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('hoot_current_job_id');
            localStorage.removeItem('hoot_is_polling');
          } catch (e) {
            // Silent
          }
        }
      }
    };

    verifyRestoredState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check credits when account count changes
  useEffect(() => {
    if (bcsAmount >= 5 && bcsAmount <= 100) {
      setIsCheckingCredits(true);
      checkCredits(bcsAmount).then((result) => {
        setCurrentCredits(result.currentCredits);
        setIsCheckingCredits(false);
      }).catch(() => {
        setIsCheckingCredits(false);
      });
    }
  }, [bcsAmount]);

  // Poll job status when jobId is set
  useEffect(() => {
    if (!currentJobId || !isPolling) {
      return;
    }

    setActive(true);

    const POLL_INTERVAL = 10000;
    const MAX_POLL_TIME = 10 * 60 * 1000;
    const startTime = Date.now();
    let lastProgress: { 
      created: number; 
      requested: number; 
      accountCount: number;
      failureCount: number;
      lastLogTime?: number;
      completionLogged?: boolean;
    } = { 
      created: 0, 
      requested: 0,
      accountCount: 0,
      failureCount: 0,
      lastLogTime: Date.now(),
      completionLogged: false
    };
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('hoot_current_job_id', currentJobId);
        localStorage.setItem('hoot_is_polling', 'true');
      } catch (e) {
        console.error('Failed to save job state:', e);
      }
    }

    const clearJobState = () => {
      setIsPolling(false);
      setActive(false);
      setCurrentJobId(null);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('hoot_current_job_id');
          localStorage.removeItem('hoot_is_polling');
        } catch (e) {
          console.error('Failed to clear job state:', e);
        }
      }
    };

    const scheduleNextPoll = (delay: number = POLL_INTERVAL) => {
      if (isCancelled) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(pollOnce, delay);
    };

    const pollOnce = async () => {
      if (isCancelled) return;

      if (Date.now() - startTime > MAX_POLL_TIME) {
        addMessage('error', 'Job polling timeout after 10 minutes.');
        clearJobState();
        return;
      }

      try {
        const result = await fetchJobStatus(currentJobId);

        if (isCancelled) return;

        if (!result.success || !result.status) {
          const err = result.error || '';
          
          if (err.toLowerCase().includes('not found')) {
            addMessage('error', 'Job no longer exists.');
            clearJobState();
            return;
          }
          
          if (err.toLowerCase().includes('rate limit')) {
            addMessage('warning', 'Rate limited. Waiting 60 seconds...');
            scheduleNextPoll(60000);
            return;
          }
          
          addMessage('warning', `Error: ${err}. Retrying...`);
          scheduleNextPoll();
          return;
        }

        const status = result.status;

        const currentAccountCount = status.accounts?.length || 0;
        if (currentAccountCount > lastProgress.accountCount) {
          const newAccountCount = currentAccountCount - lastProgress.accountCount;
          for (let i = 0; i < newAccountCount; i++) {
            addMessage('success', 'Account Created');
          }
          lastProgress.accountCount = currentAccountCount;
        }

        const currentFailureCount = status.failures?.length || 0;
        if (currentFailureCount > lastProgress.failureCount && status.failures) {
          const newFailureCount = currentFailureCount - lastProgress.failureCount;
          const failuresToShow = status.failures.slice(lastProgress.failureCount);
          failuresToShow.forEach((failure) => {
            const errorCode = failure.code || 'E099';
            addMessage('error', `Account Failed - Error Code: ${errorCode}`);
          });
          lastProgress.failureCount = currentFailureCount;
        }

        if (status.total_created !== lastProgress.created || status.total_requested !== lastProgress.requested) {
          lastProgress.created = status.total_created;
          lastProgress.requested = status.total_requested;
        }

        if (status.status === 'completed') {
          if (lastProgress.completionLogged) {
            scheduleNextPoll();
            return;
          }
          
          lastProgress.completionLogged = true;
          
          const finalAccountCount = status.accounts?.length || status.total_created || 0;
          const finalFailureCount = status.total_failed || (status.total_requested - status.total_created);
          
          if (status.total_created === 0) {
            const errorMsg = status.error_message || status.error || 'No accounts created. Please contact support.';
            addMessage('error', errorMsg);
            clearJobState();
            return;
          }
          
          addMessage('success', `Job Completed - ${status.total_created}/${status.total_requested} created.`);
          
          if (status.credits) {
            if (status.credits.deducted) {
              const creditMsg = status.credits.new_balance !== undefined
                ? `${status.credits.amount} credits deducted (New balance: ${status.credits.new_balance})`
                : `${status.credits.amount} credits deducted`;
              addMessage('success', creditMsg);
              
              window.dispatchEvent(new CustomEvent('credits-updated'));
              window.dispatchEvent(new CustomEvent('stats-updated'));
              window.dispatchEvent(new CustomEvent('accounts-updated'));
            } else {
              addMessage('warning', `⚠ Credit deduction failed: ${status.credits.error || 'Unknown error'}`);
              if (status.credits.amount_should_have_been_deducted) {
                addMessage('warning', `Accounts were created but ${status.credits.amount_should_have_been_deducted} credits were not deducted. Please contact support.`);
              }
            }
          }
          
          if (status.total_created > 0) {
            addMessage('success', `${status.total_created} account(s) saved to vault!`);
            showSuccess(`Created and saved ${status.total_created} business center accounts!`);
          }
          
          clearJobState();
          return;
        }

        if (status.status === 'failed') {
          addMessage('error', status.error || 'Job failed');
          clearJobState();
          return;
        }

        const now = Date.now();
        if (now - (lastProgress.lastLogTime || 0) >= 10000) {
          const totalFailed = status.total_failed || 0;
          if (status.total_created > 0 || totalFailed > 0) {
            const totalProcessed = status.total_created + totalFailed;
            addMessage('info', `Creating your accounts... (${totalProcessed}/${status.total_requested})`);
          } else {
            addMessage('info', 'Creating your accounts...');
          }
          lastProgress.lastLogTime = now;
        }
        
        scheduleNextPoll();
        
      } catch (error) {
        if (isCancelled) return;
        
        const msg = error instanceof Error ? error.message : 'Unknown error';
        
        if (msg.toLowerCase().includes('not found')) {
          addMessage('error', 'Job no longer exists.');
          clearJobState();
          return;
        }
        
        if (msg.toLowerCase().includes('rate limit')) {
          addMessage('warning', 'Rate limited. Waiting 60 seconds...');
          scheduleNextPoll(60000);
          return;
        }
        
        console.error('Poll error:', error);
        addMessage('warning', `Error: ${msg}. Retrying...`);
        scheduleNextPoll();
      }
    };

    timeoutId = setTimeout(pollOnce, POLL_INTERVAL);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJobId, isPolling]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
        setCountrySearchTerm('');
        setShowCurrencySelection(false);
      }
      if (pairsDropdownRef.current && !pairsDropdownRef.current.contains(event.target as Node)) {
        setIsPairsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSelectedCurrency(country.currency); // Auto-set default currency
    setCountrySearchTerm('');
    // Show currency selection within the same dropdown
    setShowCurrencySelection(true);
  };

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setIsCountryOpen(false);
    setShowCurrencySelection(false);
  };

  const handleBackToCountries = () => {
    setShowCurrencySelection(false);
    setCountrySearchTerm('');
  };

  const handleAddPair = () => {
    if (!selectedCountry || !selectedCurrency) {
      showError('Please select both country and currency');
      return;
    }
    
    // Check if pair already exists
    const exists = regionCurrencyPairs.some(
      p => p.region === selectedCountry.code && p.currency === selectedCurrency
    );
    
    if (exists) {
      showError('This region/currency pair is already added');
      return;
    }
    
    setRegionCurrencyPairs([...regionCurrencyPairs, {
      region: selectedCountry.code,
      currency: selectedCurrency
    }]);
    
    // Reset selections
    setSelectedCountry(null);
    setSelectedCurrency('');
  };

  const handleRemovePair = (index: number) => {
    const updated = regionCurrencyPairs.filter((_, i) => i !== index);
    if (updated.length === 0) {
      // Keep at least one pair (default US/USD)
      setRegionCurrencyPairs([{ region: 'US', currency: 'USD' }]);
    } else {
      setRegionCurrencyPairs(updated);
    }
  };

  const filteredCountries = countrySearchTerm
    ? countries.filter(country =>
        country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(countrySearchTerm.toLowerCase())
      )
    : countries;

  // Get all available currencies (not just region-specific)
  const getAvailableCurrencies = (): string[] => {
    // Return all currencies from all countries
    const allCurrencies = [...new Set(countries.map(c => c.currency))].sort();
    return allCurrencies;
  };

  const handleBcsInputChange = (value: string) => {
    setBcsInputValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 100) {
      setBcsAmount(numValue);
    }
  };

  const handleBcsBlur = () => {
    const numValue = parseInt(bcsInputValue) || 0;
    
    if (numValue < 5 || numValue === 0 || bcsInputValue === '' || isNaN(numValue)) {
      setBcsAmount(5);
      setBcsInputValue('5');
      showError('Business Centers must be at least 5.');
    } else if (numValue > 100) {
      setBcsAmount(100);
      setBcsInputValue('100');
      showError('Business Centers can\'t be more than 100.');
    } else {
      setBcsAmount(numValue);
      setBcsInputValue(numValue.toString());
    }
  };

  // Generate account configs from pairs (distribute evenly)
  const generateAccountConfigs = (): AccountConfig[] => {
    if (regionCurrencyPairs.length === 0) {
      return Array(bcsAmount).fill(null).map(() => ({ region: 'US', currency: 'USD' }));
    }
    
    const configs: AccountConfig[] = [];
    const accountsPerPair = Math.floor(bcsAmount / regionCurrencyPairs.length);
    const remainder = bcsAmount % regionCurrencyPairs.length;
    
    regionCurrencyPairs.forEach((pair, index) => {
      const count = accountsPerPair + (index < remainder ? 1 : 0);
      for (let i = 0; i < count; i++) {
        configs.push({ ...pair });
      }
    });
    
    return configs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPending || isPolling) {
      return;
    }
    
    const numValue = parseInt(bcsInputValue) || 0;
    
    if (numValue < 5) {
      setBcsInputValue('5');
      setBcsAmount(5);
      showError('Business Centers must be at least 5.');
      return;
    } else if (numValue > 100) {
      setBcsInputValue('100');
      setBcsAmount(100);
      showError('Business Centers can\'t be more than 100.');
      return;
    }

    // Generate account configs from pairs
    const accountConfigs = generateAccountConfigs();

    // Check credits
    const creditsCheck = await checkCredits(bcsAmount);
    if (!creditsCheck.hasEnough) {
      showError(`Insufficient credits. You have ${creditsCheck.currentCredits} credits, but need ${creditsCheck.requiredCredits}.`);
      return;
    }

    // Start deployment
    startTransition(async () => {
      clearMessages();
      setActive(true);
      addMessage('info', 'Initializing deployment...');
      addMessage('info', `Business Centers: ${bcsAmount}`);
      addMessage('info', `Credits will be deducted when accounts are created.`);

      try {
        addMessage('info', 'Creating job...');
        const result = await createJob(accountConfigs);

        if (!result.success) {
          addMessage('error', result.error || 'Failed to create job');
          showError(result.error || 'Failed to create job');
          setActive(false);
          return;
        }

        if (!result.jobId) {
          addMessage('error', 'Job created but no job ID returned');
          showError('Job created but no job ID returned');
          setActive(false);
          return;
        }

        addMessage('success', 'Job created successfully!');
        addMessage('info', `Job ID: ${result.jobId}`);
        addMessage('info', 'Starting account creation process...');

        setCurrentJobId(result.jobId);
        setIsPolling(true);
        
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('hoot_current_job_id', result.jobId);
            localStorage.setItem('hoot_is_polling', 'true');
          } catch (error) {
            console.error('Failed to save job state to localStorage:', error);
          }
        }
      } catch (error) {
        addMessage('error', `Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
        showError(error instanceof Error ? error.message : 'Failed to create job');
        setActive(false);
      }
    });
  };

  const creditsLoaded = currentCredits !== null;
  const hasEnoughCredits = creditsLoaded && currentCredits >= bcsAmount;
  const canDeploy = !isPending && !isPolling && hasEnoughCredits && bcsAmount >= 5 && bcsAmount <= 100 && regionCurrencyPairs.length > 0;
  const isDeploying = isPending || isPolling;

  // Get country name for display
  const getCountryName = (code: string) => {
    const country = countries.find(c => c.code === code);
    return country ? `${country.name} (${code})` : code;
  };

  return (
    <div className="creation-form-container">
      <form onSubmit={handleSubmit} className="creation-form">
        {/* Country/Currency Combined Dropdown */}
        <div className="form-field form-field-country-currency">
          <label htmlFor="country-currency" className="form-label">
            Country & Currency <span className="required">*</span>
          </label>
          <div className="country-currency-row">
            <div className="custom-dropdown country-currency-dropdown" ref={countryDropdownRef}>
              <button
                type="button"
                className={`dropdown-toggle ${isCountryOpen ? 'open' : ''}`}
                onClick={() => {
                  setIsCountryOpen(!isCountryOpen);
                  setIsPairsDropdownOpen(false);
                  if (!isCountryOpen) {
                    setShowCurrencySelection(false);
                    setCountrySearchTerm('');
                  }
                }}
                disabled={isPending || isPolling}
              >
                <span>
                  {selectedCountry && selectedCurrency 
                    ? `${selectedCountry.name} (${selectedCountry.code}) / ${selectedCurrency}`
                    : selectedCountry
                    ? `${selectedCountry.name} (${selectedCountry.code})`
                    : 'Select Country'}
                </span>
                <span className="material-icons">{isCountryOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isCountryOpen && (
                <div className="dropdown-menu">
                  {!showCurrencySelection ? (
                    <>
                      <div className="dropdown-search">
                        <span className="material-icons">search</span>
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={countrySearchTerm}
                          onChange={(e) => setCountrySearchTerm(e.target.value)}
                          className="dropdown-search-input"
                          autoFocus
                        />
                      </div>
                      <div className="dropdown-list">
                        {regions.map(region => {
                          const regionCountries = filteredCountries.filter(c => c.region === region);
                          if (regionCountries.length === 0) return null;
                          return (
                            <div key={region} className="dropdown-group">
                              <div className="dropdown-group-header">{region}</div>
                              {regionCountries.map(country => (
                                <button
                                  key={country.code}
                                  type="button"
                                  className={`dropdown-item ${selectedCountry?.code === country.code ? 'selected' : ''}`}
                                  onClick={() => handleCountrySelect(country)}
                                >
                                  <span>{country.name}</span>
                                  <span className="dropdown-item-code">{country.code}</span>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="dropdown-header-back">
                        <button
                          type="button"
                          onClick={handleBackToCountries}
                          className="back-button"
                        >
                          <span className="material-icons">arrow_back</span>
                          <span>Back to Countries</span>
                        </button>
                        <div className="selected-country-display">
                          {selectedCountry?.name} ({selectedCountry?.code})
                        </div>
                      </div>
                      <div className="dropdown-search">
                        <span className="material-icons">search</span>
                        <input
                          type="text"
                          placeholder="Search currencies..."
                          value={countrySearchTerm}
                          onChange={(e) => setCountrySearchTerm(e.target.value)}
                          className="dropdown-search-input"
                          autoFocus
                        />
                      </div>
                      <div className="dropdown-list">
                        {getAvailableCurrencies()
                          .filter(currency => 
                            !countrySearchTerm || 
                            currency.toLowerCase().includes(countrySearchTerm.toLowerCase())
                          )
                          .map(currency => (
                            <button
                              key={currency}
                              type="button"
                              className={`dropdown-item ${selectedCurrency === currency ? 'selected' : ''}`}
                              onClick={() => handleCurrencySelect(currency)}
                            >
                              {currency}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleAddPair}
              className="add-pair-button"
              disabled={!selectedCountry || !selectedCurrency || isPending || isPolling}
            >
              <span className="material-icons">add</span>
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Number of Accounts with Pairs Dropdown */}
        <div className="form-field form-field-accounts-row">
          {/* Pairs Dropdown - Left of Accounts */}
          <div className="form-field-pairs-dropdown">
            <div className="custom-dropdown" ref={pairsDropdownRef}>
              <button
                type="button"
                className={`dropdown-toggle pairs-dropdown-toggle ${isPairsDropdownOpen ? 'open' : ''}`}
                onClick={() => {
                  setIsPairsDropdownOpen(!isPairsDropdownOpen);
                  setIsCountryOpen(false);
                  setShowCurrencySelection(false);
                }}
              >
                <span className="material-icons">list</span>
                <span>Selected Pairs ({regionCurrencyPairs.length})</span>
                <span className="material-icons">{isPairsDropdownOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isPairsDropdownOpen && (
                <div className="dropdown-menu pairs-dropdown-menu">
                  <div className="pairs-dropdown-header">
                    <span>Region / Currency Pairs</span>
                    <span className="pairs-count">{regionCurrencyPairs.length} pair(s)</span>
                  </div>
                  <div className="pairs-dropdown-list">
                    {regionCurrencyPairs.length === 0 ? (
                      <div className="pairs-empty">No pairs added yet</div>
                    ) : (
                      regionCurrencyPairs.map((pair, index) => (
                        <div key={index} className="pair-dropdown-item">
                          <span className="pair-dropdown-text">
                            {getCountryName(pair.region)} / {pair.currency}
                          </span>
                          {regionCurrencyPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                handleRemovePair(index);
                                if (regionCurrencyPairs.length === 1) {
                                  setIsPairsDropdownOpen(false);
                                }
                              }}
                              className="pair-dropdown-remove"
                              disabled={isPending || isPolling}
                            >
                              <span className="material-icons">close</span>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {regionCurrencyPairs.length > 0 && (
                    <div className="pairs-dropdown-hint">
                      Accounts will be distributed evenly across these pairs
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="accounts-input-wrapper">
            <label htmlFor="bcs-amount" className="form-label">
              Number of Accounts <span className="required">*</span>
              {isCheckingCredits && (
                <span className="material-icons spinning" style={{ 
                  marginLeft: '0.5rem', 
                  fontSize: '1rem', 
                  verticalAlign: 'middle' 
                }}>sync</span>
              )}
            </label>
            <input
              type="number"
              id="bcs-amount"
              value={bcsInputValue}
              onChange={(e) => handleBcsInputChange(e.target.value)}
              onBlur={handleBcsBlur}
              className="bcs-input-simple"
              placeholder="Enter amount (5-100)"
              disabled={isPending || isPolling}
              min="5"
              max="100"
            />
          </div>
        </div>

        {/* Submit Button - Bottom Right */}
        <div className="form-field form-field-submit-bottom-right">
          <button
            type="submit"
            className="deployment-button"
            disabled={!canDeploy || isDeploying}
            onClick={(e) => {
              if (isDeploying) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            {isPending || isPolling ? (
              <>
                <span className="material-icons spinning">sync</span>
                {isPolling ? 'Deployment in Progress...' : 'Starting Deployment...'}
              </>
            ) : !creditsLoaded || isCheckingCredits ? (
              <>
                <span className="material-icons spinning">sync</span>
                Loading...
              </>
            ) : (
              <>
                <span className="material-icons">rocket_launch</span>
                {hasEnoughCredits ? 'Start Deployment' : 'Insufficient Credits'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
