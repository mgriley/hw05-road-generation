import {vec3,vec4} from 'gl-matrix';
import {setGL} from './globals';
import {Blob, generate_mesh} from './geometry/Blob';

function v3(x, y, z) {
  return vec3.fromValues(x, y, z);
}

function v3e() {
  return v3(0,0,0);
}

function v4(x, y, z, w) {
  return vec4.fromValues(x, y, z, w);
}

function gen_sphere(x, y): any  {
  let v_angle = y * Math.PI;    
  let h_angle = x * 2.0 * Math.PI;
  let pos = v3(
    Math.sin(v_angle) * Math.cos(h_angle),
    Math.sin(v_angle) * Math.sin(h_angle),
    Math.cos(v_angle));
  let nor = vec3.clone(pos);
  return [pos, nor];
}

function gen_torus(nx, ny): any {
  let theta = nx * 2 * Math.PI;
  let phi = ny * 2 * Math.PI;
  let ring_pos = v3(Math.cos(theta), 0, Math.sin(theta));
  let inner_r = 0.2;
  let pos = vec3.add(v3e(),
    vec3.scale(v3e(), vec3.negate(v3e(), ring_pos), inner_r*Math.cos(phi)),
    vec3.scale(v3e(), v3(0,1,0), inner_r*Math.sin(phi)));
  vec3.add(pos, pos, ring_pos);
  let nor = vec3.subtract(v3e(), pos, ring_pos);
  return [pos, nor];
}

function gen_ground(x, y): any {
  let pos = v3(
    (x - 0.5) * 20.0,
    0,
    (y - 0.5) * 20.0
  );
  let nor = v3(0,1,0);
  return [pos, nor];
}

function create_ground() {
  let res = generate_mesh(2, 2, gen_ground);
  let seg = new Blob(res[0],res[1],res[2]);
  seg.create();

  let offsets = new Float32Array([
    0,0,0,
  ]);
  let rotations = new Float32Array([
    1,0,0,0,
  ]);
  let scales = new Float32Array([
    1,1,1,
  ]);
  let colors = new Float32Array([
    0.5,0.1,0,1,
  ]);
  seg.setInstanceVBOs(offsets, rotations, scales, colors);
  seg.setNumInstances(1);
  return seg;
}

function create_seg() {
  let sphere_res = generate_mesh(10, 10, gen_sphere);
  let seg = new Blob(sphere_res[0], sphere_res[1], sphere_res[2]);
  seg.create();

  let offsets = new Float32Array([
    0,0,0,
    4,0,0,
    0,0,6
  ]);
  let rotations = new Float32Array([
    1,0,0,0,
    1,0,0,0,
    0,1,0,Math.PI/4
  ]);
  let scales = new Float32Array([
    1,1,1,
    2,2,2,
    6,1,1
  ]);
  let colors = new Float32Array([
    1,0,0,1,
    0,1,0,1,
    0,0,1,1
  ]);
  seg.setInstanceVBOs(offsets, rotations, scales, colors);
  seg.setNumInstances(3);
  return seg;
}

function create_turtle() {
  return {
    position: vec3.fromValues(0,0,0),
    // xyz is axis, z is angle
    // TODO - perhaps use quat
    rotation: vec4.fromValues(1,0,0,0),
    scale: vec3.fromValues(1,1,1),
    color: vec3.fromValues(1,0,0)
  };
}

function copy_turtle(turtle) {
  let t_copy = create_turtle();
  vec3.copy(t_copy.position, turtle.position);
  vec4.copy(t_copy.rotation, turtle.rotation);
  vec3.copy(t_copy.scale, turtle.scale);
  vec3.copy(t_copy.color, turtle.color);
  return t_copy;
}

function create_rule(funcs, probs) {
  return {
    funcs: funcs,
    probs: probs
  };
}

function det_rule(func) {
  return create_rule([func], [1]);
}

function select_func(rule) {
  let rand_num = Math.random();
  let prob_sum = 0;
  for (let i = 0; i < rule.funcs.length; ++i) {
    prob_sum += rule.probs[i];
    if (rand_num < prob_sum) {
      return rule.funcs[i];
    }
  }
}

function setup_instances(drawable, instance_data) {
  let pos_list = instance_data.positions.map(p => [p[0],p[1],p[2]]).flat();
  let rotation_list = instance_data.rotations.map(v => [v[0],v[1],v[2],v[3]]).flat();
  let scale_list = instance_data.scales.map(v => [v[0],v[1],v[2]]).flat();
  let color_list = instance_data.colors.map(v => [v[0],v[1],v[2], 1.0]).flat();

  let positions = new Float32Array(pos_list);
  let rotations = new Float32Array(rotation_list);
  let scales = new Float32Array(scale_list);
  let colors = new Float32Array(color_list);

  drawable.setInstanceVBOs(positions, rotations, scales, colors);
  drawable.setNumInstances(instance_data.positions.length);
}

function add_instance(instance_data, pos, rot, scale, col) {
  instance_data.positions.push(pos);
  instance_data.rotations.push(rot);
  instance_data.scales.push(scale);
  instance_data.colors.push(col);
}

function draw_instance(instance_data, turtle) {
  let pos = vec3.clone(turtle.position);
  let rot = vec4.clone(turtle.rotation);
  let scale = vec3.clone(turtle.scale);
  let color = vec3.clone(turtle.color);
  add_instance(instance_data, pos, rot, scale, color);
}

function run_system() {
  let gen_str = 'b';
  let num_iterations = 10;

  let expansion_rules = {
    'b': create_rule([function() {
      return 'dtsb'
    }], [1]),
  };
  let draw_rules = {
    '[': det_rule(function(state) {
      state.turtle_stack.push(copy_turtle(state.turtle));  
    }),
    ']': det_rule(function(state) {
      state.turtle = state.turtle_stack.pop();
    }),
    't': det_rule(function(state) {
      vec3.add(state.turtle.position, state.turtle.position, v3(0,2,0));
    }),
    's': det_rule(function(state) {
      vec3.scale(state.turtle.scale, state.turtle.scale, 1.2);
    }),
    'd': create_rule([function(state) {
      draw_instance(
        state.instances.segments, state.turtle);
    }], [1]),
  };
  
  let instances = {
    segments: {
      positions: [],
      rotations: [],
      scales: [],
      colors: []
    },
    leaves: {
      positions: [],
      rotations: [],
      scales: [],
      colors: []
    }
  };
  let draw_state = {
    turtle: create_turtle(),
    turtle_stack: [],
    instances: instances
  };

  // generate the string
  for (let i = 0; i < num_iterations; ++i) {
    console.log(i + ': ' + gen_str);
    let next_str = '';
    for (let j = 0; j < gen_str.length; ++j) {
      let cur_char = gen_str[j];
      let exp_rule = expansion_rules[cur_char];
      if (exp_rule) {
        let exp_func = select_func(exp_rule);
        next_str += exp_func();
      } else {
        next_str += cur_char;
      }
    }
    gen_str = next_str;
  }
  console.log('final: ' + gen_str);

  // use the string to generate the object instances
  for (let i = 0; i < gen_str.length; ++i) {
    let draw_rule = draw_rules[gen_str[i]];
    if (draw_rule) {
      let draw_func = select_func(draw_rule);
      draw_func(draw_state);
    }
  }

  // extract the drawables from the draw state

  let sphere_res = generate_mesh(40, 40, gen_torus);
  let seg = new Blob(sphere_res[0], sphere_res[1], sphere_res[2]);
  seg.create();
  setup_instances(seg, instances.segments);

  let leaf_res = generate_mesh(4, 4, gen_sphere);
  let leaf = new Blob(leaf_res[0], leaf_res[1], leaf_res[2]);
  leaf.create();
  setup_instances(leaf, instances.leaves);

  let drawables = [seg, leaf];

  return drawables;
}

// returns a list of drawables to render with the instanced shader
export function generate_scene() {
  let drawables = [];

  let ground = create_ground();
  let seg = create_seg();  
  let gen_drawables = run_system();

  drawables.push(ground);
  //drawables.push(seg);
  drawables.push(...gen_drawables);

  return drawables;
}
