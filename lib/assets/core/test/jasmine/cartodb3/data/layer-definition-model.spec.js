var Backbone = require('backbone');
var ConfigModel = require('../../../../javascripts/cartodb3/data/config-model');
var UserModel = require('../../../../javascripts/cartodb3/data/user-model');
var LayerDefinitionsCollection = require('../../../../javascripts/cartodb3/data/layer-definitions-collection');
var LayerDefinitionModel = require('../../../../javascripts/cartodb3/data/layer-definition-model');
var AnalysisDefinitionNodesCollection = require('../../../../javascripts/cartodb3/data/analysis-definition-nodes-collection');

describe('cartodb3/data/layer-definition-model', function () {
  beforeEach(function () {
    this.configModel = new ConfigModel({
      base_url: '/u/pepe'
    });

    this.userModel = new UserModel({}, {
      configModel: this.configModel
    });

    this.analysisDefinitionNodesCollection = new AnalysisDefinitionNodesCollection(null, {
      configModel: this.configModel,
      userModel: this.userModel
    });

    this.collection = new LayerDefinitionsCollection(null, {
      configModel: this.configModel,
      userModel: this.userModel,
      analysisDefinitionNodesCollection: this.analysisDefinitionNodesCollection,
      mapId: 'm123',
      stateDefinitionModel: {}
    });
    this.model = new LayerDefinitionModel({
      id: 'abc-123',
      kind: 'carto',
      options: {
        type: 'CartoDB',
        color: '#FABADA',
        table_name: 'foo',
        query: 'SELECT * FROM foo',
        tile_style: 'asdasd',
        visible: true
      }
    }, {
      parse: true,
      configModel: this.configModel,
      collection: this.collection
    });
  });

  it('should set autoStyle as false if it is not defined', function () {
    expect(this.model.get('autoStyle')).toBe(false);
  });

  it('should transform some attrs to be compatible with cartodb.js', function () {
    expect(this.model.get('cartocss')).toEqual('asdasd');
    expect(this.model.get('tile_style')).toBeUndefined();

    expect(this.model.get('sql')).toContain('SELECT');
    expect(this.model.get('query')).toBeUndefined();
  });

  describe('.save', function () {
    beforeEach(function () {
      spyOn(this.model.styleModel, 'resetPropertiesFromAutoStyle');
      this.model.sync = function () {};
    });

    describe('if autostyle is enabled', function () {
      beforeEach(function () {
        this.model.set('autoStyle', '8888-7777-6666-1111');
        this.model.save();
      });

      it('should "remove" the autoStyle attribute when model is saved', function () {
        expect(this.model.get('autoStyle')).toBeFalsy();
      });

      it('should reset styleModel styles from autostyle properties', function () {
        expect(this.model.styleModel.resetPropertiesFromAutoStyle).toHaveBeenCalled();
      });

      it('should preserve auto style if attribute is true', function () {
        var savedAttrs;
        this.model.sync = function (method, model, opts) {
          savedAttrs = model.attributes;
        };
        this.model.save({ hello: true }, { shouldPreserveAutoStyle: true });
        expect(savedAttrs.autoStyle).toBeFalsy();
        expect(savedAttrs.hello).toBeDefined();
      });
    });

    describe('if autostyle is NOT enabled', function () {
      beforeEach(function () {
        delete this.model.attributes.autoStyle;
        this.model.save();
      });

      it('should not reset styleModel styles if autostyle is not applied', function () {
        expect(this.model.styleModel.resetPropertiesFromAutoStyle).not.toHaveBeenCalled();
        expect(this.model.get('autoStyle')).toBeFalsy();
      });
    });
  });

  describe('.toJSON', function () {
    it('should return the original data', function () {
      expect(this.model.toJSON()).toEqual({
        id: 'abc-123',
        kind: 'carto',
        options: {
          type: 'CartoDB',
          visible: true,
          color: '#FABADA',
          table_name: 'foo',
          query: 'SELECT * FROM foo',
          tile_style: 'asdasd',
          style_properties: jasmine.any(Object),
          cartocss_history: jasmine.any(Array),
          sql_history: jasmine.any(Array)
        }
      });
    });

    it('should not include autoStyle info', function () {
      this.model.set('autoStyle', '8888-7777-6666-1111');
      var json = this.model.toJSON();
      expect(json).not.toContain({
        autoStyle: '8888-7777-6666-1111'
      });
    });
  });

  describe('styleModel', function () {
    it('should create style model if table name attribute exists', function () {
      expect(this.model.styleModel).toBeDefined();
    });

    it('should not add style model if table name doesn\'t exist', function () {
      var mdl = new LayerDefinitionModel({
        id: 'other',
        options: {
          type: 'tiled',
          tile_style: 'asdasd'
        }
      }, {
        parse: true,
        configModel: this.configModel
      });

      expect(mdl.styleModel).toBeUndefined();
    });

    describe('.toJSON', function () {
      it('should provide style model definition', function () {
        spyOn(this.model.styleModel, 'isAutogenerated').and.returnValue(false);
        var data = this.model.toJSON();
        expect(data.options.style_properties).toBeDefined();
      });

      it('should not provide style definition if autogenerated option is true', function () {
        spyOn(this.model.styleModel, 'isAutogenerated').and.returnValue(true);
        var data = this.model.toJSON();
        expect(data.options.style_properties).not.toBeDefined();
      });
    });
  });

  describe('.isOwnerOfAnalysisNode', function () {
    beforeEach(function () {
      this.nodeModel = this.analysisDefinitionNodesCollection.add({
        id: 'b3',
        type: 'source',
        params: {
          query: 'SELECT * FROM somewhere'
        }
      });
    });

    it('should return true if given layer definition model is considered owning it', function () {
      expect(this.model.isOwnerOfAnalysisNode(this.nodeModel)).toBe(false);
      this.model.set('letter', 'b');
      expect(this.model.isOwnerOfAnalysisNode(this.nodeModel)).toBe(true);
    });
  });

  describe('for a layer with an analysis source', function () {
    beforeEach(function () {
      this.model = new LayerDefinitionModel({
        id: 'abc-123',
        kind: 'carto',
        options: {
          type: 'CartoDB',
          color: '#FABADA',
          table_name: 'foo_table',
          source: 'a1'
        }
      }, {
        parse: true,
        configModel: this.configModel
      });
    });

    it('should have a source set', function () {
      expect(this.model.get('source')).toEqual('a1');
    });

    describe('.toJSON', function () {
      it('should return the original data', function () {
        expect(this.model.toJSON()).toEqual({
          id: 'abc-123',
          kind: 'carto',
          options: {
            type: 'CartoDB',
            color: '#FABADA',
            table_name: 'foo_table',
            source: 'a1',
            style_properties: jasmine.any(Object),
            cartocss_history: jasmine.any(Array),
            sql_history: jasmine.any(Array)
          }
        });
      });
    });
  });

  describe('for a layer with an infowindow', function () {
    beforeEach(function () {
      this.configModel = new ConfigModel({
        base_url: '/u/pepe'
      });

      this.model = new LayerDefinitionModel({
        id: 'abc-123',
        kind: 'carto',
        options: {
          type: 'CartoDB',
          color: '#FABADA',
          table_name: 'foo_table',
          source: 'a1',
          style_properties: jasmine.any(Object),
          cartocss_history: jasmine.any(Array),
          sql_history: jasmine.any(Array)
        },
        infowindow: {
          template_name: 'infowindow_light',
          latlng: [0, 0],
          offset: [28, 0],
          maxHeight: 180,
          autoPan: true,
          template: '',
          content: '',
          visibility: false,
          alternative_names: {},
          fields: [
            {
              name: 'description',
              title: true,
              position: 0
            },
            {
              name: 'name',
              title: true,
              position: 1
            }
          ],
          width: 226,
          headerColor: {
            color: { fixed: '#35AAE5;', opacity: 1 }
          }
        }
      }, {
        parse: true,
        configModel: this.configModel
      });
      this.infowindowModel = this.model.infowindowModel;
    });

    it('should have an infowindow model', function () {
      expect(this.infowindowModel).toBeDefined();
      expect(this.infowindowModel.get('fields').length).toEqual(2);
    });

    describe('infowindow/tooltip reset', function () {
      beforeEach(function () {
        this.model.tooltipModel = new Backbone.Model();
        this.model.tooltipModel.unsetTemplate = function () {};
        this.model.infowindowModel = new Backbone.Model();
        this.model.infowindowModel.unsetTemplate = function () {};

        spyOn(this.model.tooltipModel, 'unsetTemplate');
        spyOn(this.model.infowindowModel, 'unsetTemplate');
        this.styleModel = this.model.styleModel;
      });

      it('should reset infowindow/tooltip template and fields if style model type is aggregated', function () {
        this.styleModel.set('type', 'heatmap');
        expect(this.model.infowindowModel.unsetTemplate).not.toHaveBeenCalled();
        expect(this.model.tooltipModel.unsetTemplate).not.toHaveBeenCalled();
        this.styleModel.set('type', 'squares');
        expect(this.model.infowindowModel.unsetTemplate).toHaveBeenCalled();
        expect(this.model.tooltipModel.unsetTemplate).toHaveBeenCalled();
      });

      it('should reset infowindow/tooltip template and fields if style model has animated enabled', function () {
        this.styleModel.set('type', 'simple');
        expect(this.model.infowindowModel.unsetTemplate).not.toHaveBeenCalled();
        expect(this.model.tooltipModel.unsetTemplate).not.toHaveBeenCalled();
        this.styleModel.set('type', 'animation');
        expect(this.model.infowindowModel.unsetTemplate).toHaveBeenCalled();
        expect(this.model.tooltipModel.unsetTemplate).toHaveBeenCalled();
      });
    });

    it('should not save the model if infowindow changes', function () {
      spyOn(this.model, 'save');
      this.infowindowModel.set('template_name', 'infowindow_dark');
      expect(this.model.save).not.toHaveBeenCalled();
    });

    describe('.toJSON', function () {
      it('should modify infowindow attribute', function () {
        this.infowindowModel.setTemplate('testing');
        var data = this.model.toJSON();
        expect(data.infowindow.template_name).toEqual('testing');
      });

      it('should return the original data', function () {
        expect(this.model.toJSON()).toEqual({
          id: 'abc-123',
          kind: 'carto',
          options: {
            type: 'CartoDB',
            color: '#FABADA',
            table_name: 'foo_table',
            source: 'a1',
            style_properties: jasmine.any(Object),
            cartocss_history: jasmine.any(Array),
            sql_history: jasmine.any(Array)
          },
          infowindow: {
            template_name: 'infowindow_light',
            latlng: [0, 0],
            offset: [28, 0],
            maxHeight: 180,
            autoPan: true,
            template: '',
            content: '',
            visibility: false,
            alternative_names: {},
            fields: [
              {
                name: 'description',
                title: true,
                position: 0
              },
              {
                name: 'name',
                title: true,
                position: 1
              }
            ],
            width: 226,
            headerColor: {
              color: { fixed: '#35AAE5;', opacity: 1 }
            }
          }
        });
      });

      it('should not provide infowindow data if model is empty', function () {
        this.infowindowModel.clear();

        expect(this.model.toJSON()).toEqual({
          id: 'abc-123',
          kind: 'carto',
          options: {
            type: 'CartoDB',
            color: '#FABADA',
            table_name: 'foo_table',
            source: 'a1',
            style_properties: jasmine.any(Object),
            cartocss_history: jasmine.any(Array),
            sql_history: jasmine.any(Array)
          }
        });
      });
    });
  });

  describe('.getAnalysisDefinitionNodeModel', function () {
    beforeEach(function () {
      this.a1 = {};
      spyOn(this.model, 'findAnalysisDefinitionNodeModel').and.returnValue(this.a1);
      this.model.set('source', 'a1');
      this.model.getAnalysisDefinitionNodeModel();
    });

    it('should return the current analysis model of layer', function () {
      expect(this.model.findAnalysisDefinitionNodeModel).toHaveBeenCalledWith('a1');
      expect(this.model.getAnalysisDefinitionNodeModel()).toBe(this.a1);
    });
  });

  describe('.findAnalysisDefinitionNodeModel', function () {
    beforeEach(function () {
      this.b1 = {id: 'b1'};
      spyOn(this.collection, 'findAnalysisDefinitionNodeModel');
      this.model.findAnalysisDefinitionNodeModel('b1');
    });

    it('should return the node for given id', function () {
      this.collection.findAnalysisDefinitionNodeModel.and.returnValue(this.b1);
      expect(this.model.findAnalysisDefinitionNodeModel('b1')).toBe(this.b1);
    });

    it('should return nothing given an id of a non-existing node', function () {
      expect(this.model.findAnalysisDefinitionNodeModel('x1')).toBeUndefined();
    });
  });

  describe('.toggleVisible', function () {
    it('should toggle the visible attr', function () {
      this.model.toggleVisible();
      expect(this.model.get('visible')).toBe(false);

      this.model.toggleVisible();
      expect(this.model.get('visible')).toBe(true);

      this.model.toggleVisible();
      expect(this.model.get('visible')).toBe(false);
    });
  });

  describe('.getNumberOfAnalyses', function () {
    beforeEach(function () {
      this.model.set('letter', 'a');
    });

    it("should return 0 if layer doesn't have a source node", function () {
      expect(this.model.getNumberOfAnalyses()).toEqual(0);
    });

    it('should return 0 if layer has an analysis node as source node', function () {
      this.analysisDefinitionNodesCollection.add({
        id: 'a0',
        type: 'source',
        params: {
          query: 'SELECT * FROM foo',
          table_name: 'foo'
        }
      });

      expect(this.model.getNumberOfAnalyses()).toEqual(0);
    });

    it('should return the number of analyses owned by the layer', function () {
      this.analysisDefinitionNodesCollection.add([{
        id: 'a0',
        type: 'source',
        params: {
          query: 'SELECT * FROM foo'
        }
      }, {
        id: 'a1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'a0'
      }, {
        id: 'a2',
        type: 'buffer',
        radio: 600,
        distance: 'meters',
        source: 'a1'
      }, {
        id: 'b0',
        type: 'source',
        params: {
          query: 'SELECT * FROM bar'
        }
      }, {
        id: 'b1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'b0'
      }]);

      this.model.set('source', 'a2');

      expect(this.model.getNumberOfAnalyses()).toEqual(2);
    });
  });

  describe('.containsNode', function () {
    beforeEach(function () {
      this.analysisDefinitionNodesCollection.add([{
        id: 'a0',
        type: 'source',
        params: {
          query: 'SELECT * FROM foo'
        }
      }, {
        id: 'a1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'a0'
      }, {
        id: 'b1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'a0'
      }]);
      this.model.set('source', 'a1');
    });

    it('should return true if layer contains given node', function () {
      expect(this.model.containsNode(this.analysisDefinitionNodesCollection.get('a1'))).toBe(true);
      expect(this.model.containsNode(this.analysisDefinitionNodesCollection.get('a0'))).toBe(true);

      expect(this.model.containsNode(this.analysisDefinitionNodesCollection.get('b1'))).toBe(false);
      expect(this.model.containsNode(false)).toBe(false);
    });
  });

  describe('.canBeDeletedByUser', function () {
    it('should return true as long as it is not the only data layer and not all the other layers depend on it', function () {
      expect(this.model.canBeDeletedByUser()).toBe(false);

      spyOn(this.collection, 'getNumberOfDataLayers').and.returnValue(3);
      expect(this.model.canBeDeletedByUser()).toBe(true);
    });
  });

  describe('.getAllDependentLayers', function () {
    beforeEach(function () {
      this.model.set('letter', 'a');
      this.model.set('source', 'a0');

      this.collection.add([{
        id: '323',
        kind: 'carto',
        letter: 'b',
        options: {
          table_name: 'alice',
          source: 'a1'
        }
      }, {
        id: '454',
        kind: 'carto',
        letter: 'e',
        options: {
          table_name: 'robin',
          source: 'b1'
        }
      }]);

      this.analysisDefinitionNodesCollection.add([{
        id: 'a0',
        type: 'source',
        params: {
          query: 'SELECT * FROM foo'
        }
      }, {
        id: 'a1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'a0'
      }, {
        id: 'b1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'a1'
      }, {
        id: 'e1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'b1'
      }]);
    });

    it('should return two layers depending on it', function () {
      /* ************************************ */
      /* Expected layers schema result:       */
      /*  _________    _________    _________ */
      /* | A      |   | B*     |   | E*     | */
      /* |  - a0  |   | - a1   |   | - b1   | */
      /* |  - a1  |   | - b1  |   | - e1   | */
      /*  _________    _________    _________ */
      /* ************************************ */

      expect(this.model.getAllDependentLayers()).toBe(2);
    });

    it('should return three layers depending on it', function () {
      /* ************************************************* */
      /* Expected layers schema result:                    */
      /*  _________    _________    _________    _________ */
      /* | A      |   | B*     |   | E*     |   | F*     | */
      /* |  - a0  |   | - a1   |   | - b1   |   | - e1   | */
      /* |  - a1  |   | - b1   |   | - e1   |   | - f1   | */
      /*  _________    _________    _________   _________ */
      /* ************************************************* */

      this.collection.add({
        id: '111',
        kind: 'carto',
        letter: 'f',
        options: {
          table_name: 'punki',
          source: 'e1'
        }
      });

      this.analysisDefinitionNodesCollection.add({
        id: 'f1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'b1'
      });

      expect(this.model.getAllDependentLayers()).toBe(3);
    });

    it('should return five layers depending on it', function () {
      /* **************************************************************************** */
      /* Expected layers schema result:                                               */
      /*  _________    _________    _________    _________    _________    _________ */
      /* | A      |   | B*     |   | E*     |   | F*     |   | G*     |   | H*     | */
      /* |  - a0  |   | - a1   |   | - b1   |   | - e1   |   | - f2   |   | - g2   | */
      /* |  - a1  |   | - b1   |   | - e1   |   | - f1   |   | - g1   |   | - h1   | */
      /* |        |   |        |   |        |   | - f2   |   | - g2   |   |        | */
      /*  _________    _________    _________   _________    _________    _________ */
      /* ************************************************************************** */

      this.collection.add([{
        id: '111',
        kind: 'carto',
        letter: 'f',
        options: {
          table_name: 'punki',
          source: 'e1'
        }
      }, {
        id: '765',
        kind: 'carto',
        letter: 'g',
        options: {
          table_name: 'alice',
          source: 'f2'
        }
      }, {
        id: '888',
        kind: 'carto',
        letter: 'h',
        options: {
          table_name: 'robin',
          source: 'g2'
        }
      }]);

      this.analysisDefinitionNodesCollection.add([{
        id: 'f1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'b1'
      }, {
        id: 'f2',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'f1'
      }, {
        id: 'g1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'f2'
      }, {
        id: 'g2',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'g1'
      }, {
        id: 'h1',
        type: 'buffer',
        radio: 300,
        distance: 'meters',
        source: 'g2'
      }]);

      expect(this.model.getAllDependentLayers()).toBe(5);
    });
  });
});
