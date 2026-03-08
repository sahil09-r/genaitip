import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CloudSun, MapPin, Thermometer, Wind, Droplets, Eye } from "lucide-react";

interface WeatherData {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  locationName: string;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

const WeatherPanel = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Fetch weather from Open-Meteo (free, no API key)
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
          );
          const weatherData = await weatherRes.json();

          // Reverse geocode for location name
          const revGeoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          const revGeoData = await revGeoRes.json();

          const locationName = revGeoData?.address?.city || 
            revGeoData?.address?.town || 
            revGeoData?.address?.village ||
            revGeoData?.address?.suburb ||
            revGeoData?.address?.county ||
            revGeoData?.address?.state_district ||
            `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

          setWeather({
            temperature: weatherData.current.temperature_2m,
            windSpeed: weatherData.current.wind_speed_10m,
            humidity: weatherData.current.relative_humidity_2m,
            weatherCode: weatherData.current.weather_code,
            locationName,
          });
        } catch {
          setError("Failed to fetch weather");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message || "Location access denied");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
          );
          const data = await res.json();
          setWeather((prev) =>
            prev
              ? {
                  ...prev,
                  temperature: data.current.temperature_2m,
                  windSpeed: data.current.wind_speed_10m,
                  humidity: data.current.relative_humidity_2m,
                  weatherCode: data.current.weather_code,
                }
              : prev
          );
        } catch {}
      });
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-panel p-4 glow-cyan">
        <div className="flex items-center gap-2 mb-2">
          <CloudSun className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Weather</span>
        </div>
        <div className="text-sm text-muted-foreground font-mono animate-pulse">
          Fetching location...
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="glass-panel p-4 glow-cyan">
        <div className="flex items-center gap-2 mb-2">
          <CloudSun className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Weather</span>
        </div>
        <div className="text-sm text-destructive font-mono">{error || "Unavailable"}</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 glow-cyan"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CloudSun className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Live Weather</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-primary font-mono">
          <MapPin className="w-3 h-3" />
          {weather.locationName}
        </div>
      </div>

      <div className="text-2xl font-bold font-mono text-foreground mb-1">
        {weather.temperature.toFixed(1)}°C
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        {weatherDescriptions[weather.weatherCode] || "Unknown"}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-primary" />
          <div>
            <div className="text-xs font-mono text-foreground">{weather.windSpeed} km/h</div>
            <div className="text-[9px] text-muted-foreground">Wind</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-primary" />
          <div>
            <div className="text-xs font-mono text-foreground">{weather.humidity}%</div>
            <div className="text-[9px] text-muted-foreground">Humidity</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-primary" />
          <div>
            <div className="text-xs font-mono text-foreground">
              {weather.weatherCode <= 3 ? "Good" : "Low"}
            </div>
            <div className="text-[9px] text-muted-foreground">Visibility</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherPanel;
