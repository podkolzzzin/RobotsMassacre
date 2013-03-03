using Entity;
using Entity.Tile;
using Level;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;

namespace MapEditing
{
    class MapSaver
    {
        private static int _numSpawners;
        public static bool Save(string fileName, MapEditor data)
        {
            _numSpawners = 0;
            BinaryWriter writer = new BinaryWriter(File.Open("levels\\" + fileName, FileMode.OpenOrCreate, FileAccess.Write));
            writer.Write(data.LevelWidth);
            writer.Write(data.LevelHeight);

            GEntity entity, tile;
            for (int i = 0; i < data.LevelWidth; i++)
            {
                for (int j = 0; j < data.LevelHeight; j++)
                {
                    entity = data._getEntity(i, j);
                    tile = data._getTile(i, j);
                    writer.Write((byte)_toMapEntity(entity, tile));
                }
            }

            if (_numSpawners == 0)
            {
                writer.Flush();
                writer.Close();
                File.Delete("levels\\" + fileName);
                return false;
            }
            else
            {
                writer.Flush();
                writer.Close();
                MapWarehouse.AddMap(fileName, data._mode);
                return true;
            }
        }

        private static MapEntity _toMapEntity(GEntity entity, GEntity tile)
        {
            if (entity != null)
            {
                if (entity.Type == TileType.METAL)
                    return MapEntity.Metal;
            }

            if (entity == null)
            {
                return _tileToMapEntity(tile);
            }
            else
            {
                if (entity.GetType() == typeof(Spawner))
                {
                    _numSpawners++;
                    if (entity.Team == Teams.Red)
                    {
                        if (tile.Type == TileType.WATER)
                            return MapEntity.RedSpawnerOnWater;
                        else if (tile.Type == TileType.GRAVEL)
                            return MapEntity.RedSpawnerOnGravel;
                        else if (tile.Type == TileType.SAND)
                            return MapEntity.RedSpawnerOnSand;
                        else if (tile.Type == TileType.GRASS)
                            return MapEntity.RedSpawnerOnGrass;
                    }
                    else
                    {
                        if (tile.Type == TileType.WATER)
                            return MapEntity.BluSpawnerOnWater;
                        else if (tile.Type == TileType.GRAVEL)
                            return MapEntity.BluSpawnerOnGravel;
                        else if (tile.Type == TileType.SAND)
                            return MapEntity.BluSpawnerOnSand;
                        else if (tile.Type == TileType.GRASS)
                            return MapEntity.BluSpawnerOnGrass;
                    }
                }
                else if (entity.GetType() == typeof(Flag))
                {
                    if (entity.Team == Teams.Red)
                    {
                        if (tile.Type == TileType.WATER)
                            return MapEntity.RedFlagOnWater;
                        else if (tile.Type == TileType.GRAVEL)
                            return MapEntity.RedFlagOnGravel;
                        else if (tile.Type == TileType.SAND)
                            return MapEntity.RedFlagOnSand;
                        else if (tile.Type == TileType.GRASS)
                            return MapEntity.RedFlagOnGrass;
                    }
                    else
                    {
                        if (tile.Type == TileType.WATER)
                            return MapEntity.BluFlagOnWater;
                        else if (tile.Type == TileType.GRAVEL)
                            return MapEntity.BluFlagOnGravel;
                        else if (tile.Type == TileType.SAND)
                            return MapEntity.BluFlagOnSand;
                        else if (tile.Type == TileType.GRASS)
                            return MapEntity.BluFlagOnGrass;
                    }
                }
                else if (entity.Type == TileType.WALL)
                {
                    if (tile.Type == TileType.WATER)
                        return MapEntity.WallOnWater;
                    else if (tile.Type == TileType.GRAVEL)
                        return MapEntity.WallOnGravel;
                    else if (tile.Type == TileType.SAND)
                        return MapEntity.WallOnSand;
                    else if (tile.Type == TileType.GRASS)
                        return MapEntity.WallOnGrass;
                }
            }

            throw new ArgumentException("Unknown tile entity pair");
        }

        private static MapEntity _tileToMapEntity(GEntity tile)
        {
            switch (tile.Type)
            {
                case TileType.WATER:
                    return MapEntity.Water;
                case TileType.SAND:
                    return MapEntity.Sand;
                case TileType.GRASS:
                    return MapEntity.Gravel;
                case TileType.GRAVEL:
                    return MapEntity.Gravel;
            }
            throw new ArgumentException("Unknown type of tile");
        }
    }
}
