import asyncio
import datetime
import math
import random
import logging
from typing import Dict, Any, List
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import Tag, HistoricalPoint, AlarmRule, AlarmEvent, AHIAssetHealth
from app.cache.redis_service import redis_service
from app.config import settings

logger = logging.getLogger(__name__)

class YokogawaPlantSimulator:
    def __init__(self):
        self.running = False
        self.step = 0
        self.buffer_points: List[HistoricalPoint] = []
        self.buffer_flush_counter = 0

    async def start(self):
        self.running = True
        logger.info("Starting Yokogawa DCS & Asset Health Simulator...")
        asyncio.create_task(self._simulation_loop())

    async def stop(self):
        self.running = False
        logger.info("Stopped Yokogawa DCS Simulator.")

    def _generate_telemetry(self) -> Dict[str, Dict[str, Any]]:
        self.step += 1
        t = self.step * 0.05
        now = datetime.datetime.utcnow()
        now_iso = now.isoformat() + "Z"
        now_ms = int(now.timestamp() * 1000)

        # Process physics simulation with thermal lag & realistic turbulence
        temp_top = 118.0 + 3.2 * math.sin(t * 0.4) + random.uniform(-0.3, 0.3)
        temp_bot = 235.0 + 4.5 * math.sin(t * 0.25 + 0.8) + random.uniform(-0.5, 0.5)
        pressure = 145.2 + 2.1 * math.sin(t * 0.8) + random.uniform(-0.2, 0.2)
        flow_feed = 450.0 + 12.0 * math.sin(t * 0.15) + random.uniform(-2.0, 2.0)
        reflux_flow = 182.0 + 6.0 * math.cos(t * 0.3) + random.uniform(-1.0, 1.0)
        level_sump = 58.5 + 4.0 * math.sin(t * 0.1) + random.uniform(-0.4, 0.4)
        
        # Vibration with occasional transient micro-spike
        base_vib = 2.1 + 0.4 * math.sin(t * 1.5)
        if random.random() < 0.05:  # 5% chance of transient anomaly
            base_vib += random.uniform(1.5, 2.8)
        vib_rms = max(0.5, base_vib + random.uniform(-0.1, 0.1))

        # Yokogawa MT-Distance (Mahalanobis-Taguchi metric)
        # Higher when temp/pressure deviate from normal correlation envelope
        mt_dist = 1.1 + 0.3 * abs(math.sin(t * 0.2)) + (vib_rms - 2.1) * 0.4 + random.uniform(0.0, 0.15)
        ahi_health = max(60.0, min(99.8, 98.5 - (mt_dist - 1.0) * 8.0))

        telemetry = {
            "TIC_101.PV": {
                "tag_name": "TIC_101.PV",
                "display_name": "Column Overhead Temp",
                "value": round(temp_top, 2),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "TIC_102.PV": {
                "tag_name": "TIC_102.PV",
                "display_name": "Reboiler Bottom Temp",
                "value": round(temp_bot, 2),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "PIC_101.PV": {
                "tag_name": "PIC_101.PV",
                "display_name": "Overhead Pressure",
                "value": round(pressure, 2),
                "eng_units": "kPa",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FIC_101.PV": {
                "tag_name": "FIC_101.PV",
                "display_name": "Crude Feed Flow Rate",
                "value": round(flow_feed, 2),
                "eng_units": "m³/h",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FIC_102.PV": {
                "tag_name": "FIC_102.PV",
                "display_name": "Naphtha Reflux Flow",
                "value": round(reflux_flow, 2),
                "eng_units": "m³/h",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "LIC_101.PV": {
                "tag_name": "LIC_101.PV",
                "display_name": "Column Sump Level",
                "value": round(level_sump, 2),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "VIB_101.RMS": {
                "tag_name": "VIB_101.RMS",
                "display_name": "Feed Pump DE Vibration",
                "value": round(vib_rms, 3),
                "eng_units": "mm/s",
                "quality": "GOOD" if vib_rms < 4.5 else "UNCERTAIN",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "AHI_SENSORS"
            },
            "AHI_C101.HEALTH": {
                "tag_name": "AHI_C101.HEALTH",
                "display_name": "Asset Health Index",
                "value": round(ahi_health, 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_AHI"
            },
            "AHI_C101.MT_DIST": {
                "tag_name": "AHI_C101.MT_DIST",
                "display_name": "MT Anomaly Distance",
                "value": round(mt_dist, 2),
                "eng_units": "score",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_PDA"
            },
            "PUMP_101A.ST": {
                "tag_name": "PUMP_101A.ST",
                "display_name": "Crude Pump 101A Run State",
                "value": 1,
                "eng_units": "State",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "XV_101.POS": {
                "tag_name": "XV_101.POS",
                "display_name": "Column Feed ESD Valve",
                "value": 100.0,
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "PROSAFE_RS"
            },
            # VDU Tags
            "VDU_TIC_201.PV": {
                "tag_name": "VDU_TIC_201.PV",
                "display_name": "VDU Bottom Temp",
                "value": round(382.0 + 3.0 * math.sin(t * 0.3) + random.uniform(-0.4, 0.4), 2),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "VDU_PIC_201.PV": {
                "tag_name": "VDU_PIC_201.PV",
                "display_name": "VDU Ejector Pressure",
                "value": round(4.6 + 0.3 * math.sin(t * 0.7) + random.uniform(-0.1, 0.1), 2),
                "eng_units": "kPa",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "VDU_FIC_201.PV": {
                "tag_name": "VDU_FIC_201.PV",
                "display_name": "VDU Residue Flow",
                "value": round(212.0 + 4.0 * math.cos(t * 0.2) + random.uniform(-1.0, 1.0), 2),
                "eng_units": "m³/h",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "VDU_VIB_201.RMS": {
                "tag_name": "VDU_VIB_201.RMS",
                "display_name": "VDU Pump Vibration",
                "value": round(1.8 + 0.15 * math.sin(t * 1.1) + random.uniform(-0.05, 0.05), 3),
                "eng_units": "mm/s",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "AHI_SENSORS"
            },
            "VDU_AHI.HEALTH": {
                "tag_name": "VDU_AHI.HEALTH",
                "display_name": "VDU Asset Health Index",
                "value": round(94.5 - 0.8 * abs(math.sin(t * 0.1)), 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_AHI"
            },
            "VDU_AHI.MT_DIST": {
                "tag_name": "VDU_AHI.MT_DIST",
                "display_name": "VDU MT Anomaly Distance",
                "value": round(1.35 + 0.2 * abs(math.sin(t * 0.15)), 2),
                "eng_units": "score",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_PDA"
            },
            # FCCU Tags
            "FCC_TIC_301.PV": {
                "tag_name": "FCC_TIC_301.PV",
                "display_name": "FCC Riser Outlet Temp",
                "value": round(534.0 + 3.8 * math.sin(t * 0.4) + random.uniform(-0.5, 0.5), 2),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FCC_TIC_302.PV": {
                "tag_name": "FCC_TIC_302.PV",
                "display_name": "FCC Regenerator Bed Temp",
                "value": round(685.0 + 4.5 * math.sin(t * 0.3) + random.uniform(-0.6, 0.6), 2),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FCC_PIC_301.PV": {
                "tag_name": "FCC_PIC_301.PV",
                "display_name": "FCC Reactor Pressure",
                "value": round(242.0 + 2.5 * math.sin(t * 0.6) + random.uniform(-0.3, 0.3), 2),
                "eng_units": "kPa",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FCC_AHI.HEALTH": {
                "tag_name": "FCC_AHI.HEALTH",
                "display_name": "FCC Asset Health Index",
                "value": round(91.8 - 1.2 * abs(math.sin(t * 0.1)), 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_AHI"
            },
            "FCC_AHI.MT_DIST": {
                "tag_name": "FCC_AHI.MT_DIST",
                "display_name": "FCC MT Anomaly Distance",
                "value": round(1.85 + 0.3 * abs(math.sin(t * 0.2)), 2),
                "eng_units": "score",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "OPREX_PDA"
            },
            # Water Transfer & Distribution Loop SCADA Mimic Tags
            "PT-101.PV": {
                "tag_name": "PT-101.PV",
                "display_name": "P-101 Discharge Pressure",
                "value": round(4.8 + 0.12 * math.sin(t * 0.5) + random.uniform(-0.02, 0.02), 2),
                "eng_units": "bar",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "FT-101.PV": {
                "tag_name": "FT-101.PV",
                "display_name": "P-101 Transfer Flowrate",
                "value": round(128.5 + 2.2 * math.sin(t * 0.3) + random.uniform(-0.4, 0.4), 1),
                "eng_units": "m³/h",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "LT-101.PV": {
                "tag_name": "LT-101.PV",
                "display_name": "Feed Storage Tank T-101 Level",
                "value": round(65.0 - 0.5 * math.sin(t * 0.08), 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "LT-102.PV": {
                "tag_name": "LT-102.PV",
                "display_name": "Product Receiving Tank T-102 Level",
                "value": round(82.5 + 0.4 * math.sin(t * 0.08), 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "PUMP_101A.RUN": {
                "tag_name": "PUMP_101A.RUN",
                "display_name": "Water Transfer Pump P-101A Running",
                "value": 1,
                "eng_units": "State",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "PUMP_101A.RUN_STATUS": {
                "tag_name": "PUMP_101A.RUN_STATUS",
                "display_name": "Pump 101A Status Indicator",
                "value": "RUNNING",
                "eng_units": "State",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "PUMP_101A.DIFF_HEAD": {
                "tag_name": "PUMP_101A.DIFF_HEAD",
                "display_name": "Pump 101A Differential Head",
                "value": round(45.2 + 0.6 * math.sin(t * 0.4), 1),
                "eng_units": "m",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "CENTUM_VP"
            },
            "XV-101.POS": {
                "tag_name": "XV-101.POS",
                "display_name": "Transfer Block Valve XV-101 Position",
                "value": 100.0,
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "PROSAFE_RS"
            },
            # --- SWIMMING POOL SCADA SYSTEM (ThingsBoard Parity) ---
            "POOL_STATUS": {
                "tag_name": "POOL_STATUS",
                "display_name": "Swimming Pool Operational Status",
                "value": "Active",
                "eng_units": "Status",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "POOL_SCADA"
            },
            "OUTDOOR_TEMP.PV": {
                "tag_name": "OUTDOOR_TEMP.PV",
                "display_name": "Outdoor Ambient Temperature",
                "value": round(26.6 + 0.3 * math.sin(t * 0.1) + random.uniform(-0.05, 0.05), 1),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "WEATHER_STATION"
            },
            "TARGET_TEMP.SP": {
                "tag_name": "TARGET_TEMP.SP",
                "display_name": "Pool Temperature Setpoint",
                "value": 36.0,
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "HEAT_PUMP_TC"
            },
            "POOL_TEMP.PV": {
                "tag_name": "POOL_TEMP.PV",
                "display_name": "Pool Basin Water Temperature",
                "value": round(35.9 + 0.15 * math.sin(t * 0.2) + random.uniform(-0.03, 0.03), 1),
                "eng_units": "°C",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "RTD_SENSOR"
            },
            "POOL_VOLUME.PV": {
                "tag_name": "POOL_VOLUME.PV",
                "display_name": "Pool Water Volume",
                "value": 55000,
                "eng_units": "L",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "POOL_SCADA"
            },
            "POOL_LEVEL.PV": {
                "tag_name": "POOL_LEVEL.PV",
                "display_name": "Pool Water Level",
                "value": round(98.2 + 0.2 * math.sin(t * 0.05), 1),
                "eng_units": "%",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "LEVEL_TRANSMITTER"
            },
            "FLOW_RATE.PV": {
                "tag_name": "FLOW_RATE.PV",
                "display_name": "Circulation Flow Rate",
                "value": round(198.0 + 2.5 * math.sin(t * 0.5) + random.uniform(-0.5, 0.5), 1),
                "eng_units": "L/min",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "MAG_FLOWMETER"
            },
            "POOL_PH.PV": {
                "tag_name": "POOL_PH.PV",
                "display_name": "Pool Water pH",
                "value": round(7.35 + 0.04 * math.sin(t * 0.15), 2),
                "eng_units": "pH",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "WATER_QUALITY_PANEL"
            },
            "POOL_ORP.PV": {
                "tag_name": "POOL_ORP.PV",
                "display_name": "Pool Water ORP Redox",
                "value": round(715.0 + 3.0 * math.cos(t * 0.2), 0),
                "eng_units": "mV",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "WATER_QUALITY_PANEL"
            },
            "POOL_CHLORINE.PV": {
                "tag_name": "POOL_CHLORINE.PV",
                "display_name": "Free Chlorine Residual",
                "value": round(1.45 + 0.05 * math.sin(t * 0.3), 2),
                "eng_units": "ppm",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "WATER_QUALITY_PANEL"
            },
            "FILTER_PUMP.RUN": {
                "tag_name": "FILTER_PUMP.RUN",
                "display_name": "Circulation Pump State",
                "value": 1,
                "eng_units": "State",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "VFD_DRIVE"
            },
            "HEAT_PUMP.RUN": {
                "tag_name": "HEAT_PUMP.RUN",
                "display_name": "Heat Pump State",
                "value": 1,
                "eng_units": "State",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "HEAT_PUMP"
            },
            "FILTER_DP.PV": {
                "tag_name": "FILTER_DP.PV",
                "display_name": "Sand Filter Differential Pressure",
                "value": round(0.42 + 0.02 * math.sin(t * 0.1), 2),
                "eng_units": "bar",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "DIFF_PRESSURE"
            },
            "FILTER_MODE.VAL": {
                "tag_name": "FILTER_MODE.VAL",
                "display_name": "Sand Filter Valve Mode",
                "value": "Filter",
                "eng_units": "Mode",
                "quality": "GOOD",
                "timestamp": now_iso,
                "ts_ms": now_ms,
                "source": "MULTIPORT_VALVE"
            },
            "VALVE_1": {"tag_name": "VALVE_1", "display_name": "Valve 1", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_2": {"tag_name": "VALVE_2", "display_name": "Valve 2", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_3": {"tag_name": "VALVE_3", "display_name": "Valve 3", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_4": {"tag_name": "VALVE_4", "display_name": "Valve 4", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_5": {"tag_name": "VALVE_5", "display_name": "Valve 5", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_6": {"tag_name": "VALVE_6", "display_name": "Valve 6", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_7": {"tag_name": "VALVE_7", "display_name": "Valve 7", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_8": {"tag_name": "VALVE_8", "display_name": "Valve 8", "value": 0, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"},
            "VALVE_9": {"tag_name": "VALVE_9", "display_name": "Valve 9", "value": 1, "quality": "GOOD", "timestamp": now_iso, "ts_ms": now_ms, "source": "ACTUATOR"}
        }
        return telemetry

    async def _simulation_loop(self):
        while self.running:
            try:
                telemetry = self._generate_telemetry()
                now_dt = datetime.datetime.utcnow()

                # 1. Update Redis cache & publish live frame
                for tag_name, tag_data in telemetry.items():
                    await redis_service.set_tag_value(tag_name, tag_data)
                    raw_val = tag_data.get("value")
                    try:
                        num_val = float(raw_val)
                        self.buffer_points.append(
                            HistoricalPoint(
                                tag_name=tag_name,
                                timestamp=now_dt,
                                value=num_val,
                                quality=tag_data.get("quality", "GOOD")
                            )
                        )
                    except (ValueError, TypeError):
                        pass

                await redis_service.publish_live_frame({
                    "event": "telemetry_update",
                    "timestamp": now_dt.isoformat() + "Z",
                    "tags": telemetry
                })

                # 2. Batch flush historical points to PostgreSQL every 5 seconds
                self.buffer_flush_counter += 1
                if self.buffer_flush_counter >= 5:
                    self.buffer_flush_counter = 0
                    points_to_save = self.buffer_points[:]
                    self.buffer_points.clear()
                    asyncio.create_task(self._flush_history_to_db(points_to_save))

            except Exception as e:
                logger.error("Error in plant simulator loop: %s", e)

            await asyncio.sleep(settings.simulator_interval_sec)

    async def _flush_history_to_db(self, points: List[HistoricalPoint]):
        if not points:
            return
        try:
            async with AsyncSessionLocal() as session:
                session.add_all(points)
                await session.commit()
        except Exception as e:
            logger.warning("Failed to flush historical telemetry to PostgreSQL: %s", e)

plant_simulator = YokogawaPlantSimulator()
