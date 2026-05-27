// Injected after #include <color_fragment> in the terrain material.
// uWaterLevel and vTerrainWorldY are declared by onBeforeCompile.
{
  float depth       = uWaterLevel - vTerrainWorldY;
  float depthFactor = clamp( depth / 6.0, 0.0, 1.0 );
  // Shallow: murky teal. Deep: near-black navy.
  vec3  shallowUnder = vec3( 0.05, 0.22, 0.28 );
  vec3  deepUnder    = vec3( 0.01, 0.04, 0.10 );
  vec3  underwaterCol = mix( shallowUnder, deepUnder, depthFactor );
  diffuseColor.rgb   = mix( diffuseColor.rgb, underwaterCol, depthFactor * 0.9 );
}
