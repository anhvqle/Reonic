import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Slider } from "./components/ui/slider";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";
import { Label } from "./components/ui/label";

export default function App() {
  const [chargepoints, setChargepoints] = useState(20);
  const [arrivalMultiplier, setArrivalMultiplier] = useState(100);
  const [consumption, setConsumption] = useState(18);
  const [chargingPower, setChargingPower] = useState(11);

  const concurrencyData = useMemo(() => {
    const currentFactor = Array.from({ length: 30 }, (_, i) => {
      const cp = i + 1;
      return 1.0 * (arrivalMultiplier * consumption) / (cp * chargingPower);
    });

    const minFactor = Math.min(...currentFactor);

    return currentFactor.map((factor, i) => ({
      chargepoints: i + 1,
      concurrencyFactor: parseFloat((factor / minFactor).toFixed(3)),
    }));
  }, [arrivalMultiplier, consumption, chargingPower]);

  const visibleData = concurrencyData.slice(0, chargepoints);

  const arrivalProbabilities = [
    0, 0, 0, 0.94, 0.94, 0.94,
    0.94, 2.83, 2.83, 5.66, 5.66, 5.66,
    7.55, 7.55, 7.55, 10.38, 10.38, 10.38,
    4.72, 4.72, 4.72, 0.94, 0.94, 0.94,
  ];

  const exampleDayData = arrivalProbabilities.map((p, hour) => ({
    hour: `${hour}:00`,
    totalPower: Math.round((p / 100) * arrivalMultiplier * chargepoints * chargingPower),
  }));

  const totalEnergyKWh = useMemo(() => {
    const sessionsPerDay = (arrivalMultiplier / 100) * chargepoints;
    return Math.round(sessionsPerDay * consumption * 365);
  }, [chargepoints, arrivalMultiplier, consumption]);

  const eventStats = useMemo(() => {
    const perDay = Math.round((arrivalMultiplier / 100) * chargepoints);
    return {
      day: perDay,
      week: perDay * 7,
      month: perDay * 30,
      year: perDay * 365,
    };
  }, [arrivalMultiplier, chargepoints]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          EV Charging Simulation
        </h1>

        <Card className="p-6 shadow-md rounded-xl bg-white">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Label className="block mb-1 text-gray-700">
                Number of Chargepoints: <span className="font-semibold text-blue-600">{chargepoints}</span>
              </Label>
              <Slider
                defaultValue={[chargepoints]}
                min={1}
                max={30}
                step={1}
                onValueChange={(val) => setChargepoints(val[0])}
              />
            </div>

            <div>
              <Label className="block mb-1 text-gray-700">Arrival Probability Multiplier (%)</Label>
              <Input
                type="number"
                value={arrivalMultiplier}
                onChange={(e) => setArrivalMultiplier(Number(e.target.value))}
                min={20}
                max={200}
                className="w-full"
              />
            </div>

            <div>
              <Label className="block mb-1 text-gray-700">Consumption (kWh/100km)</Label>
              <Input
                type="number"
                value={consumption}
                onChange={(e) => setConsumption(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <Label className="block mb-1 text-gray-700">Charging Power per Chargepoint (kW)</Label>
              <Input
                type="number"
                value={chargingPower}
                onChange={(e) => setChargingPower(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 shadow-md rounded-xl bg-white">
          <CardContent>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Concurrency Factor vs Chargepoints
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visibleData} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                <Line type="monotone" dataKey="concurrencyFactor" stroke="#4f46e5" strokeWidth={2} />
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" />
                <XAxis
                  dataKey="chargepoints"
                  label={{
                    value: "Chargepoints",
                    position: "insideBottom",
                    offset: 0,
                    dy: 16,
                    style: { fill: "#6b7280" },
                  }}
                />
                <YAxis
                  domain={[0, 1]}
                  label={{
                    value: "Concurrency Factor",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    style: { fill: "#6b7280", textAnchor: "middle" },
                  }}
                />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-6 shadow-md rounded-xl bg-white">
          <CardContent>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Example Day Power</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={exampleDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis label={{ value: "kW", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="totalPower" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-6 shadow-md rounded-xl bg-white">
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold mb-2">Total Energy Charged</h3>
              <p className="text-2xl font-bold text-blue-600">{totalEnergyKWh} kWh</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Charging Events</h3>
              <ul className="space-y-1">
                <li><strong>Year:</strong> {eventStats.year}</li>
                <li><strong>Month:</strong> {eventStats.month}</li>
                <li><strong>Week:</strong> {eventStats.week}</li>
                <li><strong>Day:</strong> {eventStats.day}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
