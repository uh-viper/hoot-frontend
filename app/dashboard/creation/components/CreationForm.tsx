"use client";

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../contexts/ToastContext';

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
  const { showError } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [bcsAmount, setBcsAmount] = useState<number>(5);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [currencySearchTerm, setCurrencySearchTerm] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleBcsChange = (value: number, isBlur = false) => {
    if (isNaN(value) || value === 0) {
      setBcsAmount(value);
      return;
    }
    
    if (value < 5) {
      setBcsAmount(5);
      showError('Business Centers must be at least 5. Value set to 5.');
    } else if (value > 25) {
      setBcsAmount(25);
      showError('Business Centers cannot exceed 25. Value set to 25.');
    } else {
      setBcsAmount(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry || !selectedCurrency || !bcsAmount || bcsAmount < 5 || bcsAmount > 25) {
      if (!bcsAmount || bcsAmount < 5 || bcsAmount > 25) {
        if (bcsAmount < 5) {
          setBcsAmount(5);
          showError('Business Centers must be at least 5. Value set to 5.');
        } else if (bcsAmount > 25) {
          setBcsAmount(25);
          showError('Business Centers cannot exceed 25. Value set to 25.');
        } else {
          showError('Please enter a valid Business Centers amount (5-25).');
        }
      }
      return;
    }
    // TODO: Handle form submission
    console.log({ country: selectedCountry, currency: selectedCurrency, bcsAmount });
  };

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
          </label>
          <input
            type="number"
            id="bcs-amount"
            value={bcsAmount}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '') {
                setBcsAmount(0);
                return;
              }
              const value = parseInt(inputValue) || 0;
              handleBcsChange(value, false);
            }}
            onBlur={(e) => {
              const value = parseInt(e.target.value) || 0;
              if (value === 0) {
                setBcsAmount(5);
                showError('Business Centers must be at least 5. Value set to 5.');
              } else {
                handleBcsChange(value, true);
              }
            }}
            className="bcs-input-simple"
            placeholder="Enter amount (5-25)"
          />
        </div>

        {/* Submit Button */}
        <div className="form-field form-field-submit">
          <button
            type="submit"
            className="deployment-button"
            disabled={!selectedCountry || !selectedCurrency || !bcsAmount || bcsAmount < 5 || bcsAmount > 25}
          >
            <span className="material-icons">rocket_launch</span>
            Start Deployment
          </button>
        </div>
      </form>
    </div>
  );
}
