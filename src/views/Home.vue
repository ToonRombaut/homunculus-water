<template>
  <div class="home" ref="container"></div>
</template>

<script>
import * as THREE from "three";
import fragment from "@assets/shader/fragment.glsl?raw";
import vertex from "@assets/shader/vertex.glsl?raw";
import * as toc from "three-orbit-controls";
import brush from "@assets/img/brush.png";
import abstract from "@assets/img/abstract.png";
export default {
  name: "Home",
  data() {
    return {
      scene: null,
      scene1: null,
      width: null,
      height: null,
      renderer: null,
      container: null,
      camera: null,
      controls: null,
      time: 0,
      clock: null,
      isPlaying: true,
      material: null,
      geometry: null,
      plane: null,
      meshes: [],
      mouse: new THREE.Vector2(0, 0),
      prevMouse: new THREE.Vector2(0, 0),
      currentWave: 0,
      quad: null,
    };
  },
  mounted() {
    //scene
    this.scene = new THREE.Scene();
    this.scene1 = new THREE.Scene();
    //container - width & height
    this.container = this.$refs.container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    //renderer
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.ouputEncoding = THREE.sRGBEncoding;
    //add canvas
    this.container.appendChild(this.renderer.domElement);
    //camera
    // this.camera = new THREE.PerspectiveCamera(
    //   70,
    //   window.innerWidth / window.innerHeight,
    //   0.001,
    //   1000
    // );

    this.baseTexture = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    const frustumSize = this.height;
    const aspect = this.width / this.height;
    this.camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      -1000,
      1000
    );
    this.camera.position.set(0, 0, 2);
    //orbit controls
    const orbitControls = new toc(THREE);
    this.controls = new orbitControls(this.camera, this.renderer.domElement);
    //clock
    this.clock = new THREE.Clock();
    //add objects to scene
    this.addObjects();
    //resize - set size
    this.resize();
    //start render
    this.render();
    //add resize event
    window.addEventListener("resize", this.resize);
    window.addEventListener("mousemove", this.mouseMove);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("mousemove", this.mouseMove);
  },
  methods: {
    mouseMove(e) {
      this.mouse.x = e.clientX - this.width / 2;
      this.mouse.y = this.height / 2 - e.clientY;
    },
    addObjects() {
      this.material = new THREE.ShaderMaterial({
        extensions: {
          derivatives: "#extension GL_OES_standard_derivatives : enable",
        },
        side: THREE.DoubleSide,
        uniforms: {
          time: { type: "f", value: 0 },
          resolution: { type: "v4", value: new THREE.Vector4() },
          uDisplacement: { value: null },
          uTexture: { value: new THREE.TextureLoader().load(abstract) },
        },
        // wireframe: true,
        // transparent: true,
        vertexShader: vertex,
        fragmentShader: fragment,
      });

      this.max = 50;

      // this.material1 = new THREE.MeshBasicMaterial({
      //   // color: 0xff0000,
      //   map: new THREE.TextureLoader().load(brush),
      //   transparent: true,
      // });

      this.geometry = new THREE.PlaneBufferGeometry(64, 64, 1, 1);
      this.geometryFullscreen = new THREE.PlaneBufferGeometry(
        this.width,
        this.height,
        1,
        1
      );
      for (let index = 0; index < this.max; index++) {
        let m = new THREE.MeshBasicMaterial({
          // color: 0xff0000,
          map: new THREE.TextureLoader().load(brush),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });

        let mesh = new THREE.Mesh(this.geometry, m);
        mesh.visible = false;
        mesh.rotation.z = 2 * Math.PI * Math.random();
        this.scene.add(mesh);
        this.meshes.push(mesh);
      }

      this.quad = new THREE.Mesh(this.geometryFullscreen, this.material);
      this.scene1.add(this.quad);
    },
    resize() {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    },
    setNewWave(x, y, index) {
      let mesh = this.meshes[index];
      mesh.visible = true;
      mesh.position.x = x;
      mesh.position.y = y;
      mesh.scale.x = mesh.scale.y = 0.2;
      mesh.material.opacity = 0.5;
    },
    trackMousePos() {
      if (
        Math.abs(this.mouse.x - this.prevMouse.x) > 4 ||
        Math.abs(this.mouse.y - this.prevMouse.y) > 4
      ) {
        this.setNewWave(this.mouse.x, this.mouse.y, this.currentWave);
        this.currentWave = (this.currentWave + 1) % this.max;
      }
      this.prevMouse.x = this.mouse.x;
      this.prevMouse.y = this.mouse.y;
    },
    render() {
      this.trackMousePos();
      if (!this.isPlaying) return;
      this.time += this.clock.getElapsedTime();
      this.material.uniforms.time.value = this.time;
      requestAnimationFrame(this.render.bind(this));

      this.renderer.setRenderTarget(this.baseTexture);
      this.renderer.render(this.scene, this.camera);
      this.material.uniforms.uDisplacement.value = this.baseTexture.texture;
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.scene1, this.camera);

      for (let i = 0; i < this.meshes.length; i++) {
        if (this.meshes[i].visible) {
          this.meshes[i].rotation.z += 0.02;
          this.meshes[i].material.opacity *= 0.96;
          if (this.meshes[i].material.opacity < 0.002)
            this.meshes[i].visible = false;
          this.meshes[i].scale.x = 0.982 * this.meshes[i].scale.x + 0.108;
          this.meshes[i].scale.y = this.meshes[i].scale.x;
        }
      }
    },
    play() {
      if (!this.isPlaying) {
        this.render();
        this.isPlaying = true;
      }
    },
    stop() {
      this.isPlaying = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.home {
  width: 100vw;
  height: 100vh;
}
</style>