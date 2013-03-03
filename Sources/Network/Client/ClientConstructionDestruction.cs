using Entity;
using Level;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Windows.Forms;

namespace Network
{
	public partial class GameClient
	{
		public IPAddress SIp { get { return ServerIpEp.Address; } }
		public IPAddress CIp { get { return GameClient.SelfIP; } }
		public int CPort { get { return _port; } }

		public GameClient(IPAddress ServerIp, int ServerPort)
		{
			_construct(new IPEndPoint(ServerIp, ServerPort));
		}

		public GameClient()
		{
			_createGame();
		}

		public void Init(List<GEntity> Entities, List<Player> Players)
		{
			this.Players = Players;
			this.Entities = Entities;
		}

		private void _construct(IPEndPoint ipep = null)
		{
			System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
			timer.Interval = 1000;
			timer.Tick += findNotActive;
			timer.Start();

			_requestTime = new List<DateTime>();
			try
			{
				_client = new UdpClient(CLIENT_PORT);
				_port = CLIENT_PORT;
			}
			catch
			{
				try
				{
					_client = new UdpClient(CLIENT_PORT + 1);
					_port = CLIENT_PORT + 1;
				}
				catch
				{
					_client = new UdpClient(CLIENT_PORT + 2);
					_port = CLIENT_PORT + 2;
				}
			}
			if (ipep != null)
			{
				ServerIpEp = ipep;
			}
		}

		public void Disconnect()
		{
			byte[] data;
			int pos;
			if (IsMain)
			{
				IPAddress ip = null;
				foreach (IPEndPoint ipep in _connections)
				{
					if (ipep != null && (ipep.Address != CIp && ipep.Port != CPort))
					{
						ip = ipep.Address;
					}
				}
				if (ip != null)
				{
					data = new byte[sizeof(int) + sizeof(long) + sizeof(int)];
					pos = 0;
					BinaryHelper.Write((int)UDPCommands.ServerChanged, ref pos, ref data);
					BinaryHelper.Write(ip.Address, ref pos, ref data);
					BinaryHelper.Write(GameLevel.BonusId, ref pos, ref data);
					_broadcast(data);
				}
			}
			data = new byte[sizeof(int) * 2];
			pos = 0;
			//BinaryHelper.Write((int)UDPCommands.ClientDisconnected, ref pos, ref data);
			// BinaryHelper.Write(CurrentPlayer.Id, ref pos, ref data);
			_broadcast(data);
			_thread.Abort();
			_client.Close();
		}
	}
}