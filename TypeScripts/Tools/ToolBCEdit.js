/// <reference path="../_reference.d.ts" />
/// <reference path="./ITool.ts" />
/// <reference path="../Controllers/Vector3InputController.ts" />
/// <reference path="../BCTool/BCToolTabController.ts" />
var ToolBCEditMode;
(function (ToolBCEditMode) {
    ToolBCEditMode[ToolBCEditMode["FullMove"] = 0] = "FullMove";
    ToolBCEditMode[ToolBCEditMode["FullRotate"] = 1] = "FullRotate";
    ToolBCEditMode[ToolBCEditMode["ManualMove"] = 2] = "ManualMove";
    ToolBCEditMode[ToolBCEditMode["ManualRotate"] = 3] = "ManualRotate";
    ToolBCEditMode[ToolBCEditMode["ManualGridMove"] = 4] = "ManualGridMove";
    ToolBCEditMode[ToolBCEditMode["ManualGridRotate"] = 5] = "ManualGridRotate";
})(ToolBCEditMode || (ToolBCEditMode = {}));
var ToolBCEdit = /** @class */ (function () {
    function ToolBCEdit(mode) {
        this._mode = mode;
        this._grid = null;
        this._mesh = null;
        this._gridTransformWorld = null;
        this._space = "local";
    }
    ToolBCEdit.prototype.Start = function () {
        App.Layout.Controls.enabled = true;
        App.Layout.SetCursor("default");
        var transformCntrl = App.Layout.TransformControl;
        transformCntrl.setSpace("local"); // local, world
        if (this._mode == ToolBCEditMode.ManualMove ||
            this._mode == ToolBCEditMode.ManualGridMove ||
            this._mode == ToolBCEditMode.FullMove) {
            transformCntrl.setMode("translate");
        }
        else if (this._mode == ToolBCEditMode.ManualRotate ||
            this._mode == ToolBCEditMode.ManualGridRotate ||
            this._mode == ToolBCEditMode.FullRotate) {
            transformCntrl.setMode("rotate");
        }
        else {
            throw new Error("Not support mode : " + this._mode);
        }
        transformCntrl.setSize(1); // relative size
        // Get from 
        var ent = BCToolTabController.Instance.GetSelectedBCTool();
        if (ent == null) {
            MessageBox.ShowError("BC Tool not selected");
        }
        else {
            this.AttachToEntity(ent);
        }
    };
    ToolBCEdit.prototype.End = function () {
        var layout = App.Layout;
        App.Layout.Controls.enabled = true;
        App.Layout.Controls.resetState(); //owner custom function
        var transformCntrl = App.Layout.TransformControl;
        if (transformCntrl.object) {
            transformCntrl.detach(transformCntrl.object);
        }
        transformCntrl.setMode("");
        // Also remove from scene
        if (_.contains(layout.Scene.children, transformCntrl)) {
            layout.Scene.remove(transformCntrl);
        }
        this.MergeComponents();
    };
    ToolBCEdit.prototype.MergeComponents = function () {
        if (this._mesh != null && this._grid != null) {
            if (!_.contains(this._mesh.children, this._grid)) {
                // composite BC Tool back
                App.Layout.Scene.remove(this._grid);
                this._mesh.updateMatrixWorld(false);
                if (this._mode == ToolBCEditMode.ManualMove ||
                    this._mode == ToolBCEditMode.ManualRotate) {
                    var matMeshWorldInv = new THREE.Matrix4();
                    matMeshWorldInv.getInverse(this._mesh.matrixWorld);
                    // restore grid transform
                    this._grid.matrix.identity();
                    this._grid.applyMatrix(this._gridTransformWorld);
                    this._grid.applyMatrix(matMeshWorldInv);
                }
                else if (this._mode == ToolBCEditMode.ManualGridMove ||
                    this._mode == ToolBCEditMode.ManualGridRotate) {
                    var matMeshInv = new THREE.Matrix4();
                    matMeshInv.getInverse(this._mesh.matrix);
                    this._grid.applyMatrix(matMeshInv);
                }
                this._mesh.add(this._grid);
            }
        }
        this._mesh = null;
        this._grid = null;
        this._gridTransformWorld = null;
    };
    ToolBCEdit.prototype.SplitEnt = function (mesh) {
        this._mesh = mesh;
        this._grid = mesh.children[0];
        // First get world matrix
        this._grid.updateMatrixWorld(false);
        this._gridTransformWorld = this._grid.matrixWorld.clone();
        mesh.remove(this._grid);
        App.Layout.Scene.add(this._grid);
        this._mesh.updateMatrix();
        this._grid.applyMatrix(this._mesh.matrix);
    };
    ToolBCEdit.prototype.MouseDown = function (evt) {
        if (evt.button == 0) {
            // Disable orbit control on left mouse
            App.Layout.Controls.enabled = false;
        }
    };
    ToolBCEdit.prototype.MouseUp = function (evt) {
        //var layout = App.Layout;
        //// Enable orbit control on up event
        //App.Layout.Controls.enabled = true;
        //var vec2 = new THREE.Vector2(evt.clientX, evt.clientY);
        //var pickEnt = layout.Selector.GetEntityByScreenPoint(vec2, EntityType.BCTool);
        //if (pickEnt == null)
        //{
        //    return;
        //}
        //this.AttachToEntity(pickEnt);
    };
    ToolBCEdit.prototype.AttachToEntity = function (pickEnt) {
        var layout = App.Layout;
        var transformCntrl = App.Layout.TransformControl;
        if (transformCntrl.object == null || transformCntrl.object != pickEnt) {
            if (!(pickEnt instanceof THREE.Mesh)) {
                return;
            }
            var mesh = pickEnt;
            // Add transform control to scene
            //
            if (!_.contains(layout.Scene.children, transformCntrl)) {
                layout.Scene.add(transformCntrl);
            }
            if (this._mode == ToolBCEditMode.FullMove || this._mode == ToolBCEditMode.FullRotate) {
                // Merge previous components
                this.MergeComponents();
                transformCntrl.attach(mesh);
            }
            else if (this._mode == ToolBCEditMode.ManualMove || this._mode == ToolBCEditMode.ManualRotate) {
                // Merge previous components
                this.MergeComponents();
                // Split current ent
                this.SplitEnt(mesh);
                transformCntrl.attach(this._mesh);
            }
            else if (this._mode == ToolBCEditMode.ManualGridMove || this._mode == ToolBCEditMode.ManualGridRotate) {
                // Merge previous components
                this.MergeComponents();
                // Split current ent
                this.SplitEnt(mesh);
                transformCntrl.attach(this._grid);
            }
        }
    };
    ToolBCEdit.prototype.MouseMove = function (evt) {
    };
    ToolBCEdit.prototype.KeyDown = function (evt) {
        var self = this;
        var transformCntrl = App.Layout.TransformControl;
        if (!transformCntrl.object) {
            return;
        }
        if (evt.keyCode === 0 || evt.keyCode === 32) {
            var transformCntrl = App.Layout.TransformControl;
            if (this._space == "local") {
                this._space = "world";
            }
            else {
                this._space = "local";
            }
            transformCntrl.setSpace(this._space);
        }
        else if (evt.keyCode === 13) {
            // Enter coords in modal dialog
            var isAngleInput = (self._mode == ToolBCEditMode.ManualGridRotate || self._mode == ToolBCEditMode.ManualRotate);
            Vector3InputController.Instance.Show(isAngleInput, function (vec) {
                var mesh = transformCntrl.object;
                if (self._mode == ToolBCEditMode.ManualGridMove ||
                    self._mode == ToolBCEditMode.ManualMove) {
                    var matTranslate = new THREE.Matrix4();
                    matTranslate.makeTranslation(vec.x, vec.y, vec.z);
                    self._mesh.applyMatrix(matTranslate);
                }
                else if (self._mode == ToolBCEditMode.ManualGridRotate ||
                    self._mode == ToolBCEditMode.ManualRotate) {
                    // Convert to radiance
                    vec.x = (vec.x / 180) * Math.PI;
                    vec.y = (vec.y / 180) * Math.PI;
                    vec.z = (vec.z / 180) * Math.PI;
                    var matRot = new THREE.Matrix4();
                    matRot.makeRotationFromEuler(new THREE.Euler(vec.x, vec.y, vec.z));
                    var origMat = self._mesh.matrix.clone();
                    self._mesh.matrix.identity();
                    self._mesh.applyMatrix(matRot);
                    self._mesh.applyMatrix(origMat);
                }
            });
        }
    };
    return ToolBCEdit;
}());
