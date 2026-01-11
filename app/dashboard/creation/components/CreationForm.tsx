"use client";

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useConsole } from '../contexts/ConsoleContext';
import { checkCredits, createJob, fetchJobStatus, saveAccounts } from '../../../actions/account-creation';
import { useTransition } from 'react';

interface Country {
  code: string;
  name: string;
  currency: string;
  region: string;
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

export default function CreationForm() {
  const { showError, showSuccess } = useToast();
  const { addMessage, setActive, clearMessages } = useConsole();
  const [isPending, startTransition] = useTransition();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [bcsAmount, setBcsAmount] = useState<number>(5);
  const [bcsInputValue, setBcsInputValue] = useState<string>('5');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [currencySearchTerm, setCurrencySearchTerm] = useState('');
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
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check credits when form values change
  useEffect(() => {
    if (bcsAmount >= 5 && bcsAmount <= 25) {
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
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Restore active state in console if we're polling
    if (isPolling) {
      setActive(true);
    }

    const POLL_INTERVAL = 10000; // 10 seconds (API limit: 60 requests/minute)
    const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes max
    const startTime = Date.now();
    let lastProgress = { created: 0, requested: 0 };
    let initialTimeoutRef: NodeJS.Timeout | null = null;

    const pollStatus = async () => {
      try {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > MAX_POLL_TIME) {
          addMessage('error', 'Job polling timeout after 30 minutes. Please check job status manually.');
          setIsPolling(false);
          setActive(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        const result = await fetchJobStatus(currentJobId);
        if (!result.success || !result.status) {
          // Handle rate limit error
          if (result.error && result.error.toLowerCase().includes('rate limit')) {
            addMessage('error', 'Rate limit exceeded. Polling will resume in 1 minute...');
            // Wait 60 seconds before resuming
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setTimeout(() => {
              if (currentJobId && isPolling) {
                pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
                pollStatus(); // Poll immediately after resume
              }
            }, 60000);
            return;
          }
          addMessage('error', result.error || 'Failed to fetch job status');
          setIsPolling(false);
          setActive(false);
          return;
        }

        const status = result.status;

        // Log any failures from the API (only new ones)
        if (status.failures && status.failures.length > 0) {
          status.failures.forEach((failure) => {
            addMessage('error', `Failed to create account ${failure.email}: ${failure.error}`);
          });
        }

        // Handle different statuses
        if (status.status === 'completed') {
          // Check if job failed even though status is "completed"
          if (status.total_created === 0 && status.error) {
            addMessage('error', `Job failed: ${status.error}`);
            setIsPolling(false);
            setActive(false);
            setCurrentJobId(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          // Check if no accounts were created
          if (status.total_created === 0) {
            addMessage('error', `Job completed but no accounts were created. ${status.error ? `Error: ${status.error}` : 'Please check the backend logs.'}`);
            setIsPolling(false);
            setActive(false);
            setCurrentJobId(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }

          addMessage('success', `Job completed! Created ${status.total_created} out of ${status.total_requested} accounts.`);
          setIsPolling(false);
          setActive(false);

          // Save accounts to database
          if (status.accounts && status.accounts.length > 0 && selectedCountry) {
            addMessage('info', 'Saving accounts to your vault...');
            const saveResult = await saveAccounts(
              currentJobId,
              status.accounts,
              selectedCountry.code,
              selectedCurrency
            );

            if (saveResult.success) {
              addMessage('success', `Successfully saved ${saveResult.savedCount} accounts to your vault!`);
              showSuccess(`Successfully created and saved ${saveResult.savedCount} business center accounts!`);
            } else {
              addMessage('error', saveResult.error || 'Failed to save accounts');
              showError(saveResult.error || 'Failed to save accounts');
            }
          }

          // Clear job ID and localStorage
          setCurrentJobId(null);
          setIsPolling(false);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('hoot_current_job_id');
              localStorage.removeItem('hoot_is_polling');
            } catch (error) {
              console.error('Failed to clear job state from localStorage:', error);
            }
          }
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status.status === 'failed') {
          addMessage('error', status.error || 'Job failed');
          setIsPolling(false);
          setActive(false);
          setCurrentJobId(null);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('hoot_current_job_id');
              localStorage.removeItem('hoot_is_polling');
            } catch (error) {
              console.error('Failed to clear job state from localStorage:', error);
            }
          }
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status.status === 'running' || status.status === 'pending') {
          // Only log progress if it actually changed
          if (status.total_created !== lastProgress.created || status.total_requested !== lastProgress.requested) {
            addMessage('info', `Progress: ${status.total_created} / ${status.total_requested} accounts created...`);
            lastProgress = { created: status.total_created, requested: status.total_requested };
          }
        }
      } catch (error) {
        // Handle rate limit in catch block too
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.toLowerCase().includes('rate limit')) {
          addMessage('error', 'Rate limit exceeded. Polling will resume in 1 minute...');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setTimeout(() => {
            if (currentJobId && isPolling) {
              pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
              pollStatus();
            }
          }, 60000);
          return;
        }
        addMessage('error', `Error polling job status: ${errorMessage}`);
        setIsPolling(false);
        setActive(false);
      }
    };

        // Save job state to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('hoot_current_job_id', currentJobId);
            localStorage.setItem('hoot_is_polling', 'true');
          } catch (error) {
            console.error('Failed to save job state to localStorage:', error);
          }
        }

        // Start polling - wait 10 seconds before first poll, then poll every 10 seconds
        // This prevents hitting rate limits from immediate polling after job creation
        initialTimeoutRef = setTimeout(() => {
          pollStatus();
          pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
        }, POLL_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Also clear the initial timeout if component unmounts
      if (initialTimeoutRef) {
        clearTimeout(initialTimeoutRef);
        initialTimeoutRef = null;
      }
    };
    // Only re-run when currentJobId or isPolling changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJobId, isPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
        setCountrySearchTerm('');
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
        setCurrencySearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    // Auto-populate currency with country's default currency
    setSelectedCurrency(country.currency);
    setIsCountryOpen(false);
    setCountrySearchTerm('');
  };

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    setIsCurrencyOpen(false);
    setCurrencySearchTerm('');
  };

  const filteredCountries = countrySearchTerm
    ? countries.filter(country =>
        country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
        country.code.toLowerCase().includes(countrySearchTerm.toLowerCase())
      )
    : countries;

  // All available currencies from all countries
  const allCurrencies = [...new Set(countries.map(c => c.currency))].sort();
  
  const filteredCurrencies = currencySearchTerm
    ? allCurrencies.filter(currency =>
        currency.toLowerCase().includes(currencySearchTerm.toLowerCase())
      )
    : allCurrencies;

  const handleBcsInputChange = (value: string) => {
    // Allow empty or any input while typing (no validation, no errors)
    setBcsInputValue(value);
    
    // Update bcsAmount for button state, but only if it's a valid number
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 5 && numValue <= 25) {
      setBcsAmount(numValue);
    }
  };

  const handleBcsBlur = () => {
    // Validate and clamp only when user finishes typing (on blur)
    const numValue = parseInt(bcsInputValue) || 0;
    
    if (numValue < 5 || numValue === 0 || bcsInputValue === '' || isNaN(numValue)) {
      setBcsAmount(5);
      setBcsInputValue('5');
      showError('Business Centers must be at least 5.');
    } else if (numValue > 25) {
      setBcsAmount(25);
      setBcsInputValue('25');
      showError('Business Centers can\'t be more than 25.');
    } else {
      setBcsAmount(numValue);
      setBcsInputValue(numValue.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate BCS on submit
    const numValue = parseInt(bcsInputValue) || 0;
    let validBcsAmount = numValue;
    
    if (numValue < 5) {
      validBcsAmount = 5;
      setBcsAmount(5);
      setBcsInputValue('5');
      showError('Business Centers must be at least 5.');
      return;
    } else if (numValue > 25) {
      validBcsAmount = 25;
      setBcsAmount(25);
      setBcsInputValue('25');
      showError('Business Centers can\'t be more than 25.');
      return;
    } else if (numValue === 0) {
      validBcsAmount = 5;
      setBcsAmount(5);
      setBcsInputValue('5');
      showError('Business Centers must be at least 5.');
      return;
    }
    
    if (!selectedCountry || !selectedCurrency || validBcsAmount < 5 || validBcsAmount > 25) {
      return;
    }

    // Check credits before proceeding
    const creditsCheck = await checkCredits(validBcsAmount);
    if (!creditsCheck.hasEnough) {
      showError(`Insufficient credits. You have ${creditsCheck.currentCredits} credits, but need ${creditsCheck.requiredCredits}.`);
      return;
    }

    // Start deployment
    startTransition(async () => {
      // Don't clear messages - keep them in localStorage
      setActive(true);
      addMessage('info', 'Initializing deployment...');
      addMessage('info', `Country: ${selectedCountry.name} (${selectedCountry.code})`);
      addMessage('info', `Currency: ${selectedCurrency}`);
      addMessage('info', `Business Centers: ${validBcsAmount}`);
      addMessage('info', `Credits: ${creditsCheck.currentCredits} → ${creditsCheck.currentCredits - validBcsAmount} (deducting ${validBcsAmount})`);

      try {
        // Create job via API
        addMessage('info', 'Creating job...');
        const result = await createJob(validBcsAmount, selectedCountry.code, selectedCurrency);

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

        // Start polling for job status
        setCurrentJobId(result.jobId);
        setIsPolling(true);
      } catch (error) {
        addMessage('error', `Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
        showError(error instanceof Error ? error.message : 'Failed to create job');
        setActive(false);
      }
    });
  };

  // Calculate if user has enough credits
  const hasEnoughCredits = currentCredits !== null && currentCredits >= bcsAmount;
  const canDeploy = !isPending && !isPolling && hasEnoughCredits && selectedCountry && selectedCurrency && bcsAmount >= 5 && bcsAmount <= 25;

  return (
    <div className="creation-form-container">
      <form onSubmit={handleSubmit} className="creation-form">
        {/* Country Dropdown */}
        <div className="form-field">
          <label htmlFor="country" className="form-label">
            Country <span className="required">*</span>
          </label>
          <div className="custom-dropdown" ref={countryDropdownRef}>
            <button
              type="button"
              className={`dropdown-toggle ${isCountryOpen ? 'open' : ''}`}
              onClick={() => {
                setIsCountryOpen(!isCountryOpen);
                setIsCurrencyOpen(false);
              }}
            >
              <span>{selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : 'Select Country'}</span>
              <span className="material-icons">{isCountryOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isCountryOpen && (
              <div className="dropdown-menu">
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
              </div>
            )}
          </div>
        </div>

        {/* Currency Dropdown */}
        <div className="form-field">
          <label htmlFor="currency" className="form-label">
            Currency <span className="required">*</span>
          </label>
          <div className="custom-dropdown" ref={currencyDropdownRef}>
            <button
              type="button"
              className={`dropdown-toggle ${isCurrencyOpen ? 'open' : ''}`}
              onClick={() => {
                setIsCurrencyOpen(!isCurrencyOpen);
                setIsCountryOpen(false);
              }}
            >
              <span>{selectedCurrency || 'Select Currency'}</span>
              <span className="material-icons">{isCurrencyOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isCurrencyOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-search">
                  <span className="material-icons">search</span>
                  <input
                    type="text"
                    placeholder="Search currencies..."
                    value={currencySearchTerm}
                    onChange={(e) => setCurrencySearchTerm(e.target.value)}
                    className="dropdown-search-input"
                    autoFocus
                  />
                </div>
                <div className="dropdown-list">
                  {filteredCurrencies.map(currency => (
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
              </div>
            )}
          </div>
        </div>

        {/* BCS Amount */}
        <div className="form-field">
          <label htmlFor="bcs-amount" className="form-label">
            Business Centers <span className="required">*</span>
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
            onChange={(e) => {
              handleBcsInputChange(e.target.value);
            }}
            onBlur={handleBcsBlur}
            className="bcs-input-simple"
            placeholder="Enter amount (5-25)"
            disabled={isPending || isPolling}
          />
          {currentCredits !== null && !hasEnoughCredits && bcsAmount >= 5 && (
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#ff6b6b', 
              marginTop: '0.25rem', 
              display: 'block' 
            }}>
              Insufficient credits. You need {bcsAmount} credits but only have {currentCredits}.
            </span>
          )}
        </div>

        {/* Submit Button */}
        <div className="form-field form-field-submit">
          <button
            type="submit"
            className="deployment-button"
            disabled={!canDeploy || isPending || isPolling}
          >
            {isPending || isPolling ? (
              <>
                <span className="material-icons spinning">sync</span>
                {isPolling ? 'Deployment in Progress...' : 'Starting Deployment...'}
              </>
            ) : (
              <>
                <span className="material-icons">rocket_launch</span>
                Start Deployment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
