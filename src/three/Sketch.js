import * as THREE from "three";
import fragment from "@three/shaders/fragment.glsl?raw";
import vertex from "@three/shaders/vertex.glsl?raw";
import * as toc from "three-orbit-controls";
import brush from "@assets/img/brush.png";
import abstract from "@assets/img/abstract.png";

export default class Sketch {
    constructor() {
        //scene
        this.brushScene = new THREE.Scene();
        this.finalScene = new THREE.Scene();
        //container - width & height
        this.container = document.querySelector("#default-layout");
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
        //texture        
        this.baseTexture = new THREE.WebGLRenderTarget(this.width, this.height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });
        //camera
        const frustumSize = this.height;
        const aspect = this.width / this.height;
        this.camera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2, -1000,
            1000
        );
        this.camera.position.set(0, 0, 2);
        //orbit controls
        const orbitControls = new toc(THREE);
        this.controls = new orbitControls(this.camera, this.renderer.domElement);
        //clock
        this.clock = new THREE.Clock();
        this.time = 0;
        //events
        this.setupResize();
        this.setupMouseEvents();
    }
    addObjects = () => {
        this.meshes = [];
        this.currentWave = 0;
        this.textureMaterial = new THREE.ShaderMaterial({
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
            vertexShader: vertex,
            fragmentShader: fragment,
        });

        this.max = 50;

        this.brushGeometry = new THREE.PlaneBufferGeometry(64, 64, 1, 1);
        this.geometryFullscreen = new THREE.PlaneBufferGeometry(
            this.width,
            this.height,
            1,
            1
        );
        for (let index = 0; index < this.max; index++) {
            let brushMaterial = new THREE.MeshBasicMaterial({
                // color: 0xff0000,
                map: new THREE.TextureLoader().load(brush),
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,
            });

            let brushMesh = new THREE.Mesh(this.brushGeometry, brushMaterial);
            brushMesh.visible = false;
            brushMesh.rotation.z = 2 * Math.PI * Math.random();
            this.brushScene.add(brushMesh);
            this.meshes.push(brushMesh);
        }

        this.textureMesh = new THREE.Mesh(this.geometryFullscreen, this.textureMaterial);
        this.finalScene.add(this.textureMesh);
    };
    setNewWave(x, y, index) {
        let mesh = this.meshes[index];
        mesh.visible = true;
        mesh.position.x = x;
        mesh.position.y = y;
        mesh.scale.x = mesh.scale.y = 0.2;
        mesh.material.opacity = 0.5;
    }
    setupMouseEvents = () => {
        this.mouse = new THREE.Vector2(0, 0);
        this.prevMouse = new THREE.Vector2(0, 0);
        window.addEventListener("mousemove", this.mouseMove);
    };
    mouseMove = (e) => {
        this.mouse.x = e.clientX - this.width / 2;
        this.mouse.y = this.height / 2 - e.clientY;
    };
    trackMousePos = () => {
        if (
            Math.abs(this.mouse.x - this.prevMouse.x) > 4 ||
            Math.abs(this.mouse.y - this.prevMouse.y) > 4
        ) {
            this.setNewWave(this.mouse.x, this.mouse.y, this.currentWave);
            this.currentWave = (this.currentWave + 1) % this.max;
        }
        this.prevMouse.x = this.mouse.x;
        this.prevMouse.y = this.mouse.y;
    };

    setupResize = () => {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
    };
    render = () => {
        this.trackMousePos();
        this.time += this.clock.getElapsedTime();
        this.textureMaterial.uniforms.time.value = this.time;
        requestAnimationFrame(this.render);

        this.renderer.setRenderTarget(this.baseTexture);
        this.renderer.render(this.brushScene, this.camera);
        this.textureMaterial.uniforms.uDisplacement.value = this.baseTexture.texture;
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.renderer.render(this.finalScene, this.camera);

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
    };
    goTo = route => {
        switch (route) {
            case 'home':
                this.addObjects();
        }
        this.render();
    };
}