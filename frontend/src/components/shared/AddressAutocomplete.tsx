import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MapPin, Search, ExternalLink, Pencil, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface AddressData {
  formattedAddress: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AddressAutocompleteProps {
  /** Valor atual (endereço formatado) */
  value: string;
  /** Latitude atual */
  latitude: number | string | null;
  /** Longitude atual */
  longitude: number | string | null;
  /** Callback ao selecionar/mudar endereço */
  onAddressChange: (data: AddressData) => void;
  /** Placeholder do input */
  placeholder?: string;
  /** Classe CSS adicional */
  className?: string;
  /** Desabilitar */
  disabled?: boolean;
}

/**
 * AddressAutocomplete Component
 * Provides address lookup with Google Maps integration and manual fallback.
 *
 * Features:
 * - Google Places Autocomplete for address search
 * - Automatic Latitude/Longitude extraction
 * - Manual CEP input fallback
 * - Link to Google Maps for manual coordinate lookup
 * - Hidden Lat/Long fields that reveal on edit
 */
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  latitude,
  longitude,
  onAddressChange,
  placeholder = 'Buscar endereço...',
  className,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState<string>(String(latitude || ''));
  const [manualLng, setManualLng] = useState<string>(String(longitude || ''));
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Initialize Google Places services
  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      // PlacesService requires a map or HTMLElement
      if (mapRef.current) {
        placesService.current = new google.maps.places.PlacesService(mapRef.current);
      }
    }
  }, []);

  // Update manual coords when props change
  useEffect(() => {
    setManualLat(String(latitude || ''));
    setManualLng(String(longitude || ''));
  }, [latitude, longitude]);

  // Search for addresses
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setError(null);

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!autocompleteService.current) {
      setError('Serviço do Google Maps não disponível. Use a busca manual.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.current!.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: 'br' },
            types: ['address'],
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          }
        );
      });
      setSuggestions(response);
    } catch (err) {
      console.error('Address search error:', err);
      setError('Erro ao buscar endereços. Tente novamente ou use a opção manual.');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Select a suggestion and get details
  const handleSelectSuggestion = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current) {
      setError('Serviço do Google Maps não disponível.');
      return;
    }

    setIsSearching(true);
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'address_components', 'geometry'],
      },
      (place, status) => {
        setIsSearching(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const addressData: AddressData = {
            formattedAddress: place.formatted_address || prediction.description,
            latitude: place.geometry?.location?.lat() || null,
            longitude: place.geometry?.location?.lng() || null,
          };

          // Extract address components
          place.address_components?.forEach(component => {
            const types = component.types;
            if (types.includes('route')) addressData.street = component.long_name;
            if (types.includes('street_number')) addressData.number = component.long_name;
            if (types.includes('sublocality') || types.includes('neighborhood')) addressData.neighborhood = component.long_name;
            if (types.includes('administrative_area_level_2')) addressData.city = component.long_name;
            if (types.includes('administrative_area_level_1')) addressData.state = component.short_name;
            if (types.includes('postal_code')) addressData.postalCode = component.long_name;
          });

          onAddressChange(addressData);
          setSearchQuery('');
          setSuggestions([]);
          setIsPopoverOpen(false);
        } else {
          setError('Não foi possível obter detalhes do endereço.');
        }
      }
    );
  }, [onAddressChange]);

  // Apply manual coordinates
  const handleApplyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError('Coordenadas inválidas. Use formato decimal (ex: -23.5505, -46.6333).');
      return;
    }

    onAddressChange({
      formattedAddress: value || 'Localização manual',
      latitude: lat,
      longitude: lng,
    });
    setShowManualCoords(false);
    setError(null);
  };

  // Open Google Maps for manual coordinate lookup
  const openGoogleMapsHelp = () => {
    window.open('https://www.google.com/maps', '_blank');
  };

  const hasCoordinates = latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Hidden div for PlacesService */}
      <div ref={mapRef} style={{ display: 'none' }} />

      {/* Main Address Input with Autocomplete */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Endereço do Canteiro
        </Label>

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={disabled}
              className={cn(
                'w-full justify-start h-11 text-left font-normal',
                'bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50',
                'transition-all duration-200',
                !value && 'text-muted-foreground'
              )}
            >
              <Search className="mr-2 h-4 w-4 shrink-0 text-primary" />
              {value || placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 glass-card border-white/10" align="start">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o endereço completo..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 industrial-input"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                )}
              </div>
            </div>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="max-h-[200px] overflow-auto p-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.place_id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2 px-3 hover:bg-white/5"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-primary/60" />
                    <span className="truncate text-sm">{suggestion.description}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* No Results / Fallback */}
            {searchQuery.length >= 3 && suggestions.length === 0 && !isSearching && (
              <div className="p-4 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-orange-400/60" />
                <p className="text-sm text-muted-foreground">
                  Nenhum endereço encontrado.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 hover:bg-orange-500/10"
                    onClick={() => {
                      setShowManualCoords(true);
                      setIsPopoverOpen(false);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Digitar coordenadas manualmente
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openGoogleMapsHelp}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                    Abrir Google Maps
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm border-t border-white/10">
                {error}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Coordinates Section */}
      {(hasCoordinates || showManualCoords) && (
        <div className="p-3 rounded-lg bg-muted/30 border border-white/5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5">
              Coordenadas Geográficas
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Para obter as coordenadas: Abra o Google Maps, clique com o botão direito no local desejado e copie as coordenadas (ex: -23.5505, -46.6333).
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            {!showManualCoords && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowManualCoords(true)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                Editar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground/60">Latitude (X)</Label>
              <Input
                type="text"
                value={showManualCoords ? manualLat : String(latitude || '')}
                onChange={(e) => setManualLat(e.target.value)}
                disabled={!showManualCoords}
                className={cn(
                  'h-9 text-sm',
                  showManualCoords ? 'industrial-input' : 'bg-transparent border-none cursor-default'
                )}
                placeholder="-23.5505"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-muted-foreground/60">Longitude (Y)</Label>
              <Input
                type="text"
                value={showManualCoords ? manualLng : String(longitude || '')}
                onChange={(e) => setManualLng(e.target.value)}
                disabled={!showManualCoords}
                className={cn(
                  'h-9 text-sm',
                  showManualCoords ? 'industrial-input' : 'bg-transparent border-none cursor-default'
                )}
                placeholder="-46.6333"
              />
            </div>
          </div>

          {showManualCoords && (
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  setShowManualCoords(false);
                  setManualLat(String(latitude || ''));
                  setManualLng(String(longitude || ''));
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs gradient-primary"
                onClick={handleApplyManualCoords}
              >
                Aplicar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Help Link for Manual Entry */}
      {!hasCoordinates && !showManualCoords && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Não encontrou o endereço?</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={() => setShowManualCoords(true)}
          >
            Digitar coordenadas
          </Button>
          <span>ou</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary"
            onClick={openGoogleMapsHelp}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Abrir Google Maps
          </Button>
        </div>
      )}
    </div>
  );
};
