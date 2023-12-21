class AstronomicalObject {
  objectName: string;
  parentName: string;
  yearLength: number; // in Earth days
  axisTilt: number; // in degrees
  distanceFromParent: number; // in Astronomical Units (AU)
  orbitSpeed: number; // in km/s

  // The values for axisTilt, distanceFromSun, and orbitSpeed are based on current estimates.

  constructor(objectName: string, parentName: string, yearLength: number, axisTilt: number, distanceFromParent: number, orbitSpeed: number) {
    this.objectName = objectName;
    this.parentName = parentName;
    this.yearLength = yearLength;
    this.axisTilt = axisTilt;
    this.distanceFromParent = distanceFromParent;
    this.orbitSpeed = orbitSpeed;
  }
}
